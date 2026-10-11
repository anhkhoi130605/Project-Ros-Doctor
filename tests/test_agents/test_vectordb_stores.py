import hashlib
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

from src.agents.embedding.models import create_embedding_model
from src.agents.vectordb.revisions import RevisionedChroma
from src.agents.vectordb.stores import (
    ChromaVectorStore,
    create_chroma_store,
    get_chroma_store,
)
from src.config import Settings


def test_create_and_get_chroma_store():
    settings = Settings(
        openai_api_key="test-key",
        chroma_collection_name="custom_col",
        chroma_persist_dir="./data/custom_chroma",
    )
    mock_embeddings = MagicMock()
    profile_id = hashlib.sha256(b"test-embeddings-v1").hexdigest()
    index_id = hashlib.sha256(f"{settings.rag_source_namespace}:{profile_id}".encode()).hexdigest()

    with patch("src.agents.vectordb.stores.Chroma") as mock_chroma_cls:
        mock_instance = MagicMock()
        mock_instance._collection.metadata = {"embedding_profile": profile_id}
        mock_chroma_cls.return_value = mock_instance

        store = create_chroma_store(
            settings=settings,
            embedding_function=mock_embeddings,
            embedding_profile="test-embeddings-v1",
        )

        mock_chroma_cls.assert_called_once_with(
            collection_name=f"custom_col_chunks_v3_emb_{index_id}",
            embedding_function=mock_embeddings,
            persist_directory="./data/custom_chroma",
            collection_metadata={"embedding_profile": profile_id},
        )
        assert isinstance(store, RevisionedChroma)
        assert store._store is mock_instance

        store2 = get_chroma_store(
            settings=settings,
            embedding_function=mock_embeddings,
            embedding_profile="test-embeddings-v1",
        )
        assert isinstance(store2, RevisionedChroma)
        assert store2._store is mock_instance


def test_chroma_vector_store_delegation():
    mock_store = MagicMock()
    mock_store._collection.count.return_value = 42
    mock_store.add_documents.return_value = ["id1", "id2"]
    sample_doc = Document(page_content="test content", metadata={"source": "test"})
    mock_store.similarity_search.return_value = [sample_doc]
    mock_store.similarity_search_with_relevance_scores.return_value = [(sample_doc, 0.95)]

    wrapper = ChromaVectorStore(store=mock_store)

    assert wrapper.store is mock_store
    assert wrapper.count() == 42

    docs = [sample_doc]
    ids = wrapper.add_documents(docs, ids=["id1"])
    assert ids == ["id1", "id2"]
    mock_store.add_documents.assert_called_once_with(docs, ids=["id1"])

    results = wrapper.similarity_search("query text", k=3)
    assert len(results) == 1
    mock_store.similarity_search.assert_called_once_with("query text", k=3, filter=None)

    scored_results = wrapper.similarity_search_with_relevance_scores("query text", k=3)
    assert len(scored_results) == 1
    assert scored_results[0][1] == 0.95


def test_custom_embeddings_require_explicit_profile():
    with patch("src.agents.vectordb.stores.Chroma") as chroma:
        with pytest.raises(ValueError, match="explicit stable embedding_profile"):
            create_chroma_store(embedding_function=MagicMock())
        chroma.assert_not_called()


def test_existing_collection_profile_is_verified():
    with patch("src.agents.vectordb.stores.Chroma") as chroma:
        chroma.return_value._collection.metadata = {"embedding_profile": "wrong"}
        with pytest.raises(ValueError, match="profile mismatch"):
            create_chroma_store(embedding_function=MagicMock(), embedding_profile="test-v1")


def test_profiles_use_separate_persistent_collections(tmp_path):
    settings = Settings(openai_api_key="test-key", chroma_persist_dir=str(tmp_path))
    models = [
        create_embedding_model(api_key="test-key", dimensions=2),
        create_embedding_model(api_key="rotated-key", dimensions=2),
        create_embedding_model(api_key="test-key", dimensions=3),
        create_embedding_model(api_key="test-key", dimensions=2, base_url="https://example.invalid/v1"),
    ]
    try:
        stores = [create_chroma_store(settings=settings, embedding_function=model) for model in models]
        assert stores[0]._collection.name == stores[1]._collection.name
        assert len({store._collection.name for store in (stores[0], stores[2], stores[3])}) == 3
        other_namespace = create_chroma_store(
            settings=settings.model_copy(update={"rag_source_namespace": "another-tenant"}),
            embedding_function=models[0],
        )
        assert other_namespace._collection.name != stores[0]._collection.name

        # Exercise the real LangChain -> provider and Chroma query paths locally.
        with patch.object(models[0].client, "create", return_value={"data": [{"embedding": [1.0, 0.0]}]}) as provider:
            stores[0]._store.add_documents([Document(page_content="indexed document")], ids=["doc-1"])
            results = stores[0]._store.similarity_search("uncached query", k=1)
            assert results[0].page_content == "indexed document"
            assert provider.call_count == 2
        assert stores[2]._collection.count() == 0
        assert stores[0]._collection.count() == 1
    finally:
        for model in models:
            model.close()


@pytest.mark.asyncio
async def test_store_closes_only_embeddings_it_owns(tmp_path):
    settings = Settings(openai_api_key="test-key", chroma_persist_dir=str(tmp_path))
    owned = create_chroma_store(settings=settings)
    model = owned._owned_embeddings
    assert model is not None
    await owned.aclose()
    assert model.is_closed

    borrowed = create_embedding_model(api_key="test-key")
    store = create_chroma_store(settings=settings, embedding_function=borrowed)
    try:
        await store.aclose()
        assert not borrowed.is_closed
    finally:
        await borrowed.aclose()
