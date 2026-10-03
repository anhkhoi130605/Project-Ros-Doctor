from __future__ import annotations

from typing import Any

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from src.agents.embedding.models import get_embedding_model
from src.config import Settings, get_settings


def create_chroma_store(
    collection_name: str | None = None,
    persist_directory: str | None = None,
    embedding_function: Embeddings | None = None,
    settings: Settings | None = None,
) -> Chroma:
    """Create a persistent Chroma vector store instance."""
    active_settings = settings or get_settings()
    resolved_collection = collection_name or active_settings.chroma_collection_name
    resolved_persist_dir = persist_directory or active_settings.chroma_persist_dir
    resolved_embeddings = embedding_function or get_embedding_model(active_settings)

    return Chroma(
        collection_name=resolved_collection,
        embedding_function=resolved_embeddings,
        persist_directory=resolved_persist_dir,
    )


def get_chroma_store(
    settings: Settings | None = None,
    embedding_function: Embeddings | None = None,
) -> Chroma:
    """Get the configured Chroma vector store."""
    return create_chroma_store(settings=settings, embedding_function=embedding_function)


class ChromaVectorStore:
    """High-level wrapper around Chroma vector store for RAG operations."""

    def __init__(
        self,
        store: Chroma | None = None,
        settings: Settings | None = None,
        embedding_function: Embeddings | None = None,
    ) -> None:
        self._store = store or get_chroma_store(settings=settings, embedding_function=embedding_function)

    @property
    def store(self) -> Chroma:
        """Access the underlying Chroma instance."""
        return self._store

    def count(self) -> int:
        """Return the number of documents in the collection."""
        return self._store._collection.count()

    def add_documents(
        self,
        documents: list[Document],
        ids: list[str] | None = None,
    ) -> list[str]:
        """Add documents to the vector store with optional unique IDs."""
        return self._store.add_documents(documents, ids=ids)

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter: dict[str, Any] | None = None,
    ) -> list[Document]:
        """Search documents by semantic similarity to query."""
        return self._store.similarity_search(query, k=k, filter=filter)

    def similarity_search_with_relevance_scores(
        self,
        query: str,
        k: int = 5,
        score_threshold: float | None = None,
        filter: dict[str, Any] | None = None,
    ) -> list[tuple[Document, float]]:
        """Search documents and return similarity relevance scores."""
        return self._store.similarity_search_with_relevance_scores(
            query,
            k=k,
            score_threshold=score_threshold,
            filter=filter,
        )

    def delete(self, ids: list[str] | None = None) -> bool | None:
        """Delete documents by their IDs."""
        return self._store.delete(ids=ids)

    def reset_collection(self) -> None:
        """Delete all documents and reset the collection."""
        self._store.reset_collection()

