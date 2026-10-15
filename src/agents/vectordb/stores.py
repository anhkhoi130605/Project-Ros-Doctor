from __future__ import annotations

import hashlib
import math
from pathlib import Path
from typing import Any

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from src.agents.chunking.strategies import CHUNKING_VERSION
from src.agents.embedding.models import ResilientEmbeddingModel, get_embedding_model
from src.agents.vectordb.indexing import sync_source_chunks
from src.agents.vectordb.revisions import RevisionedChroma
from src.config import Settings, get_settings


def distance_relevance_score(distance: float, *, metric: str) -> float:
    """Bounded, monotone similarity, not a probability or diagnostic confidence.

    Chroma L2 is a *squared* distance with no fixed upper bound. LangChain's
    default 1 - distance / sqrt(2) can therefore become negative. Use an inverse
    distance mapping without changing embeddings, stored vectors or ranking.
    """
    if not math.isfinite(distance):
        raise ValueError("Vector distance must be finite")
    if metric == "l2":
        return 1.0 / (1.0 + max(0.0, distance))
    if metric == "cosine":
        return min(1.0, max(0.0, 1.0 - distance / 2.0))
    if metric == "ip":
        # Chroma returns 1 - dot_product; stable sigmoid also supports unnormalized vectors.
        dot = 1.0 - distance
        if dot >= 0:
            return 1.0 / (1.0 + math.exp(-dot))
        exp_dot = math.exp(dot)
        return exp_dot / (1.0 + exp_dot)
    raise ValueError("Unsupported vector distance metric")


def create_chroma_store(
    collection_name: str | None = None,
    persist_directory: str | None = None,
    embedding_function: Embeddings | None = None,
    settings: Settings | None = None,
    embedding_profile: str | None = None,
) -> RevisionedChroma:
    """Create a persistent Chroma store with guarded revision publication."""
    active_settings = settings or get_settings()
    resolved_collection = collection_name or active_settings.chroma_collection_name
    # Keep legacy chunks intact and prevent retrieval from mixing algorithm versions.
    suffix = f"_chunks_v{CHUNKING_VERSION}"
    if not resolved_collection.endswith(suffix):
        resolved_collection += suffix
    resolved_persist_dir = persist_directory or active_settings.chroma_persist_dir
    resolved_embeddings = embedding_function if embedding_function is not None else get_embedding_model(active_settings)
    owned_embeddings = resolved_embeddings if embedding_function is None else None

    try:
        if isinstance(resolved_embeddings, ResilientEmbeddingModel):
            profile_id = resolved_embeddings.embedding_profile_id
            if embedding_profile is not None and embedding_profile != profile_id:
                raise ValueError("embedding_profile does not match the supplied embedding model")
        else:
            if not isinstance(embedding_profile, str) or not embedding_profile.strip():
                raise ValueError("Custom embeddings require an explicit stable embedding_profile")
            profile_id = hashlib.sha256(embedding_profile.encode()).hexdigest()

        # Separate both vector spaces and namespaces. Existing collections are retained
        # for rollback; the pipeline builds the new index from authoritative sources.
        index_id = hashlib.sha256(f"{active_settings.rag_source_namespace}:{profile_id}".encode()).hexdigest()
        resolved_collection += f"_emb_{index_id}"
        raw = Chroma(
            collection_name=resolved_collection,
            embedding_function=resolved_embeddings,
            persist_directory=resolved_persist_dir,
            collection_metadata={"embedding_profile": profile_id},
        )
        if (raw._collection.metadata or {}).get("embedding_profile") != profile_id:
            raise ValueError("Collection embedding profile mismatch; rebuild into a new collection")
        configuration = raw._collection.configuration
        # Configuration is available in current Chroma; legacy metadata is a fallback.
        metric = (raw._collection.metadata or {}).get("hnsw:space", "l2")
        if isinstance(configuration, dict):
            index_config = configuration.get("hnsw") or configuration.get("spann") or {}
            metric = index_config.get("space", metric)
        raw.override_relevance_score_fn = lambda distance: distance_relevance_score(distance, metric=metric)
        manifest_name = hashlib.sha256(resolved_collection.encode()).hexdigest() + ".json"
        return RevisionedChroma(
            raw,
            Path(resolved_persist_dir).resolve() / "revision_manifests" / manifest_name,
            owned_embeddings=owned_embeddings,
        )
    except BaseException:
        if isinstance(owned_embeddings, ResilientEmbeddingModel):
            owned_embeddings.close()
        raise


def get_chroma_store(
    settings: Settings | None = None,
    embedding_function: Embeddings | None = None,
    embedding_profile: str | None = None,
) -> RevisionedChroma:
    """Get the configured Chroma vector store."""
    return create_chroma_store(
        settings=settings, embedding_function=embedding_function, embedding_profile=embedding_profile
    )


class ChromaVectorStore:
    """High-level wrapper around Chroma vector store for RAG operations."""

    def __init__(
        self,
        store: Chroma | RevisionedChroma | None = None,
        settings: Settings | None = None,
        embedding_function: Embeddings | None = None,
        embedding_profile: str | None = None,
    ) -> None:
        self._store = store or get_chroma_store(
            settings=settings, embedding_function=embedding_function, embedding_profile=embedding_profile
        )

    def close(self) -> None:
        if isinstance(self._store, RevisionedChroma):
            self._store.close()

    async def aclose(self) -> None:
        if isinstance(self._store, RevisionedChroma):
            await self._store.aclose()

    @property
    def store(self) -> Chroma | RevisionedChroma:
        """Access the underlying store or managed publication adapter."""
        return self._store

    def count(self) -> int:
        """Administrative count, including any staged/stale chunks awaiting cleanup."""
        return self._store._collection.count()

    def sync_sources(self, sources: list[Document], chunks: list[Document], batch_size: int = 50) -> int:
        """Replace complete source snapshots, publishing only after validation succeeds."""
        return sync_source_chunks(self._store, sources, chunks, batch_size)

    def add_documents(
        self,
        documents: list[Document],
        ids: list[str] | None = None,
    ) -> list[str]:
        """Legacy raw-store write; managed stores require complete source snapshots."""
        if isinstance(self._store, RevisionedChroma):
            raise ValueError("Use sync_sources(sources, chunks) to publish complete source snapshots")
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
        if isinstance(self._store, RevisionedChroma):
            raise ValueError("Use sync_sources with an empty source snapshot to remove a logical source")
        return self._store.delete(ids=ids)

    def reset_collection(self) -> None:
        """Delete all documents and reset the collection."""
        self._store.reset_collection()
