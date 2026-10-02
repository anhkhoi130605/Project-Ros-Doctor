from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # LLM
    openai_api_key: str = ""
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
    rag_chunk_overlap: int = Field(default=150, ge=0, le=1000)


@lru_cache
def get_settings() -> Settings:
    return Settings()
