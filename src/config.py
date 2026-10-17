from functools import lru_cache
from typing import Literal

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env values take precedence over system environment variables
load_dotenv(override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "AI20K Agent"
    app_env: Literal["development", "production", "test", "testing"] = "development"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,https://localhost:5173,"
        "https://ctrlshiftn.azurewebsites.net,https://ctrlshiftn-hrd3ayfue2eqgvee.eastasia-01.azurewebsites.net"
    )
    backend_api_url: str = "https://ctrlshiftn-hrd3ayfue2eqgvee.eastasia-01.azurewebsites.net"
    jwt_secret: str = "p8sDb7aQz3vR9yW1xN4fE0gH5jK2mL6u"
    jwt_algorithm: str = "HS256"
    internal_api_secret: str = ""

    # LLM
    openai_api_key: str = ""
    openai_base_url: str | None = None
    model_name: str = "gpt-4o-mini"
    llm_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    # Additive input/context/output checks, using server-side credentials only.
    guardrails_enabled: bool = True
    guardrails_model: str | None = None
    guardrails_timeout_seconds: float = Field(default=30.0, ge=1.0, le=120.0)
    guardrails_max_attempts: int = Field(default=2, ge=1, le=3)
    guardrails_max_prompt_chars: int = Field(default=128000, ge=16000, le=2000000)
    embedding_model: str = "text-embedding-3-small"
    embedding_request_timeout: float = Field(default=30.0, ge=1.0, le=300.0)
    embedding_max_retries: int = Field(default=3, ge=0, le=10)
    embedding_chunk_size: int = Field(default=256, ge=1, le=2048)
    embedding_dimensions: int | None = Field(default=None, ge=1, le=3072)
    embedding_max_concurrency: int = Field(default=10, ge=1, le=100)
    embedding_cache_enabled: bool = True
    embedding_cache_max_size: int = Field(default=2000, ge=100, le=50000)

    # Database
    database_url: str = "sqlite:///./data/app.db"
    mongo_connection_string: str = ""
    # Explicit local opt-in to reuse the .NET MongoDbSettings, without copying secrets.
    mongo_settings_file: str | None = None
    mongo_database_name: str = "CtrlShiftN"
    mongo_server_selection_timeout_ms: int = Field(default=10000, ge=1000, le=120000)
    mongo_connect_timeout_ms: int = Field(default=10000, ge=1000, le=120000)
    mongo_socket_timeout_ms: int = Field(default=15000, ge=1000, le=120000)
    mongo_min_pool_size: int = Field(default=0, ge=0, le=100)
    mongo_max_pool_size: int = Field(default=50, ge=1, le=500)

    # Vector Store
    chroma_persist_dir: str = "./data/chroma"
    chroma_collection_name: str = "ctrlshiftn_knowledge"
    rag_top_k: int = Field(default=5, ge=1, le=20)
    rag_max_documents_per_collection: int = Field(default=5000, ge=1, le=50000)
    rag_chunk_size: int = Field(default=1200, ge=200, le=8000)
    rag_chunk_overlap: int = Field(default=300, ge=0, le=1000)
    rag_chunk_unit: Literal["tokens", "characters"] = "tokens"
    rag_token_encoding: str = "cl100k_base"
    rag_source_namespace: str = Field(default="ctrlshiftn", min_length=1)
    # Set from the embedding provider contract; independent of retrieval chunk size.
    rag_embedding_max_tokens: int | None = Field(default=None, ge=1)

    @field_validator("rag_embedding_max_tokens", mode="before")
    @classmethod
    def validate_embedding_limit(cls, value):
        # Environment variables are strings; accept decimal integer syntax only.
        if isinstance(value, str) and value.isascii() and value.isdecimal():
            value = int(value)
        if value is not None and (isinstance(value, bool) or not isinstance(value, int) or value <= 0):
            raise ValueError("rag_embedding_max_tokens must be a positive integer or None")
        return value


@lru_cache
def get_settings() -> Settings:
    settings = load_shared_mongo_settings(Settings())
    return load_shared_appsettings(settings)


def load_shared_appsettings(settings: Settings) -> Settings:
    """Fallback to local appsettings.json if JWT secret is not explicitly set in env."""
    if settings.jwt_secret:
        return settings

    import json
    from pathlib import Path

    candidates = [
        Path("WebAPI/BackEnd(ASP.Net)/API/appsettings.json"),
        Path(__file__).resolve().parent.parent / "WebAPI" / "BackEnd(ASP.Net)" / "API" / "appsettings.json",
    ]
    for path in candidates:
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8-sig"))
                key = data.get("Jwt", {}).get("Key")
                if key and isinstance(key, str) and key.strip():
                    return settings.model_copy(update={"jwt_secret": key.strip()})
            except Exception:
                pass
    return settings


def load_shared_mongo_settings(settings: Settings) -> Settings:
    """Direct environment credentials take priority over an explicitly selected file."""
    if settings.mongo_connection_string or not settings.mongo_settings_file:
        return settings


    import json
    from pathlib import Path

    path = Path(settings.mongo_settings_file)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent / path
    try:
        section = json.loads(path.read_text(encoding="utf-8-sig"))["MongoDbSettings"]
        uri = section["ConnectionString"]
        database = section["DatabaseName"]
        if not isinstance(uri, str) or not uri.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("Invalid MongoDB URI")
        if not isinstance(database, str) or not database.strip():
            raise ValueError("Missing MongoDB database name")
    except (OSError, ValueError, KeyError, TypeError):
        # Never include JSON contents or credentials in configuration errors.
        raise ValueError("MONGO_SETTINGS_FILE must contain valid MongoDbSettings.ConnectionString and DatabaseName") from None
    updates = {"mongo_connection_string": uri}
    if "mongo_database_name" not in settings.model_fields_set:
        updates["mongo_database_name"] = database
    return settings.model_copy(update=updates)


def update_env_setting(key: str, value: str) -> None:
    """Cập nhật biến môi trường trong file .env và làm mới cache cấu hình."""
    import re
    from pathlib import Path

    env_path = Path(".env")
    content = env_path.read_text(encoding="utf-8") if env_path.exists() else ""

    pattern = rf"^{re.escape(key)}=.*$"
    new_line = f"{key}={value}"
    if re.search(pattern, content, flags=re.MULTILINE):
        content = re.sub(pattern, new_line, content, flags=re.MULTILINE)
    else:
        if content and not content.endswith("\n"):
            content += "\n"
        content += f"{new_line}\n"

    env_path.write_text(content, encoding="utf-8")
    load_dotenv(override=True)
    get_settings.cache_clear()
