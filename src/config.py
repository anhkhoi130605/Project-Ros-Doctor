from functools import lru_cache
from typing import Literal

from dotenv import load_dotenv
from pydantic import Field
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
    app_env: Literal["development", "production", "test"] = "development"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "http://localhost:3000"
    backend_api_url: str = "https://localhost:7149"

    # LLM
    openai_api_key: str = ""
    openai_base_url: str | None = None
    model_name: str = "gpt-4o-mini"
    llm_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    embedding_model: str = "text-embedding-3-small"

    # Database
    database_url: str = "sqlite:///./data/app.db"
    mongo_connection_string: str = ""
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


@lru_cache
def get_settings() -> Settings:
    return Settings()


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

