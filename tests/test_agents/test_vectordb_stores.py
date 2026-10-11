from unittest.mock import MagicMock, patch

from langchain_core.documents import Document

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

    with patch("src.agents.vectordb.stores.Chroma") as mock_chroma_cls:
        mock_instance = MagicMock()
        mock_chroma_cls.return_value = mock_instance

        store = create_chroma_store(
            settings=settings,
            embedding_function=mock_embeddings,
        )

        mock_chroma_cls.assert_called_once_with(
            collection_name="custom_col_chunks_v3",
            embedding_function=mock_embeddings,
            persist_directory="./data/custom_chroma",
        )
        assert isinstance(store, RevisionedChroma)
        assert store._store is mock_instance

        store2 = get_chroma_store(
            settings=settings,
            embedding_function=mock_embeddings,
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
