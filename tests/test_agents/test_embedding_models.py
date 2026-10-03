from unittest.mock import patch

import pytest
from langchain_openai import OpenAIEmbeddings

from src.agents.embedding.models import (
    _get_default_embedding_model,
    create_embedding_model,
    get_embedding_model,
)
from src.config import Settings


def test_create_embedding_model_missing_key_raises_error():
    settings = Settings(openai_api_key="")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY chưa được cấu hình"):
        create_embedding_model(settings=settings)


def test_create_embedding_model_with_api_key():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
    )
    assert isinstance(model, OpenAIEmbeddings)
    assert model.model == "text-embedding-3-small"


def test_get_embedding_model_uses_cached_default():
    _get_default_embedding_model.cache_clear()
    settings = Settings(openai_api_key="test-key")
    with patch("src.agents.embedding.models.get_settings", return_value=settings):
        model1 = get_embedding_model()
        model2 = get_embedding_model()
        assert model1 is model2
        assert isinstance(model1, OpenAIEmbeddings)
