import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.agents.embedding.models import (
    create_embedding_model,
    get_embedding_model,
    reset_global_embedding_manager,
    shutdown_embedding_model,
)
from src.agents.retrieval import pipeline as pipeline_module
from src.agents.retrieval.pipeline import MongoRAGPipeline
from src.config import Settings
from src.main import app, lifespan


@pytest.mark.asyncio
async def test_lifespan_closes_actual_rag_embedding_and_can_restart(monkeypatch):
    settings = Settings(openai_api_key="test-key", mongo_connection_string="")
    reset_global_embedding_manager(force=True)
    monkeypatch.setattr(pipeline_module, "_PIPELINE", None)
    monkeypatch.setattr(pipeline_module, "_PIPELINE_STOPPED", False)
    monkeypatch.setattr(pipeline_module, "get_settings", lambda: settings)
    monkeypatch.setattr("src.agents.embedding.models.get_settings", lambda: settings)
    instances = []
    try:
        with patch.object(MongoRAGPipeline, "_ensure_index"), patch.object(pipeline_module, "get_chroma_store"):
            for _ in range(2):
                async with lifespan(app):
                    pipeline = await asyncio.to_thread(pipeline_module.get_rag_pipeline)
                    model = pipeline._embeddings
                    instances.append(model)
                    assert model is get_embedding_model()
                    assert not model.is_closed
                assert model.is_closed
                assert model._http_client.is_closed
                assert model._http_async_client.is_closed
                assert pipeline_module._PIPELINE is None
                with pytest.raises(RuntimeError, match="stopped"):
                    pipeline_module.get_rag_pipeline()
        assert instances[0] is not instances[1]
    finally:
        await shutdown_embedding_model()
        reset_global_embedding_manager()


@pytest.mark.asyncio
async def test_lifespan_cleanup_runs_when_application_body_raises():
    with (
        patch("src.main.reset_global_embedding_manager"),
        patch("src.main.start_rag_pipeline"),
        patch("src.main.shutdown_rag_pipeline", new_callable=AsyncMock) as close_pipeline,
        patch("src.main.shutdown_embedding_model", new_callable=AsyncMock) as close_embeddings,
    ):
        with pytest.raises(ValueError, match="application failed"):
            async with lifespan(app):
                raise ValueError("application failed")
        close_pipeline.assert_awaited_once()
        close_embeddings.assert_awaited_once()


@pytest.mark.asyncio
async def test_unused_pipeline_is_not_constructed_on_shutdown(monkeypatch):
    monkeypatch.setattr(pipeline_module, "_PIPELINE", None)
    monkeypatch.setattr(pipeline_module, "_PIPELINE_STOPPED", False)
    with patch.object(pipeline_module, "MongoRAGPipeline") as constructor:
        await pipeline_module.shutdown_rag_pipeline()
        constructor.assert_not_called()


def test_pipeline_closes_own_embedding_after_index_failure():
    settings = Settings(openai_api_key="test-key", mongo_connection_string="mongodb://localhost")
    model = create_embedding_model(settings=settings)
    client = MagicMock()
    with (
        patch.object(pipeline_module, "MongoClient", return_value=client),
        patch.object(pipeline_module, "get_embedding_model", return_value=model),
        patch.object(pipeline_module, "get_chroma_store"),
        patch.object(MongoRAGPipeline, "_ensure_index", side_effect=ValueError("index failed")),
    ):
        with pytest.raises(ValueError, match="index failed"):
            MongoRAGPipeline(settings)
    assert model.is_closed
    assert model._http_client.is_closed
    assert model._http_async_client.is_closed
    client.close.assert_called_once()


@pytest.mark.asyncio
async def test_pipeline_does_not_close_borrowed_embedding():
    settings = Settings(openai_api_key="test-key", mongo_connection_string="")
    model = create_embedding_model(settings=settings)
    try:
        with patch.object(pipeline_module, "get_chroma_store"), patch.object(MongoRAGPipeline, "_ensure_index"):
            pipeline = MongoRAGPipeline(settings, embeddings=model)
        await pipeline.aclose()
        assert not model.is_closed
    finally:
        await model.aclose()
