from __future__ import annotations

from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings

from src.config import Settings, get_settings


def create_embedding_model(
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    settings: Settings | None = None,
) -> Embeddings:
    """Create an embedding model instance using configured or custom parameters."""
    active_settings = settings or get_settings()
    resolved_api_key = api_key if api_key is not None else active_settings.openai_api_key
    resolved_model = model or active_settings.embedding_model
    resolved_base_url = base_url or active_settings.openai_base_url

    if not resolved_api_key:
        raise RuntimeError("OPENAI_API_KEY chưa được cấu hình")

    kwargs: dict[str, str] = {
        "model": resolved_model,
        "api_key": resolved_api_key,
    }
    if resolved_base_url:
        kwargs["base_url"] = resolved_base_url

    return OpenAIEmbeddings(**kwargs)


@lru_cache(maxsize=1)
def _get_default_embedding_model() -> Embeddings:
    return create_embedding_model()


def get_embedding_model(settings: Settings | None = None) -> Embeddings:
    """Get the embedding model instance (uses cached default if no custom settings provided)."""
    if settings is None:
        return _get_default_embedding_model()
    return create_embedding_model(settings=settings)
