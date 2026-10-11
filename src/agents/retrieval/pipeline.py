from __future__ import annotations

import threading
from typing import Any

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from pymongo import MongoClient

from src.agents.chunking.source import make_source_id, source_text
from src.agents.chunking.strategies import (
    MarkdownHeaderChunker,
    StandardTextChunker,
)
from src.agents.embedding.models import ResilientEmbeddingModel, get_embedding_model
from src.agents.ingestion.loaders import MarkdownPlaybookLoader
from src.agents.vectordb.indexing import sync_source_chunks
from src.agents.vectordb.stores import get_chroma_store
from src.config import Settings, get_settings
from src.services.benchmark_publication import PUBLISHED_FILTER, official_benchmark


class MongoRAGPipeline:
    """Unified RAG pipeline combining ROS2 Markdown playbooks and MongoDB benchmark data."""

    def __init__(
        self,
        settings: Settings,
        embeddings: Embeddings | None = None,
        embedding_profile: str | None = None,
    ) -> None:
        if embeddings is None and not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY chưa được cấu hình")

        self._settings = settings
        self._client: MongoClient | None = None
        if settings.mongo_connection_string:
            self._client = MongoClient(
                settings.mongo_connection_string,
                serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
                connectTimeoutMS=settings.mongo_connect_timeout_ms,
                socketTimeoutMS=settings.mongo_socket_timeout_ms,
                minPoolSize=settings.mongo_min_pool_size,
                maxPoolSize=settings.mongo_max_pool_size,
                retryReads=True,
                appname=f"{settings.app_name}-rag",
            )
            self._database = self._client[settings.mongo_database_name]
        else:
            self._database = None

        self._owns_embeddings = embeddings is None
        self._embeddings = embeddings
        try:
            if self._embeddings is None:
                self._embeddings = get_embedding_model(settings)
            self._vector_store = get_chroma_store(
                settings=settings,
                embedding_function=self._embeddings,
                embedding_profile=embedding_profile,
            )
            self._ensure_index()
        except BaseException:
            self.close()
            raise

    def _load_markdown_documents(self) -> list[Document]:
        loader = MarkdownPlaybookLoader(namespace=self._settings.rag_source_namespace)
        return loader.load()

    def _load_mongo_documents(self) -> list[Document]:
        if self._database is None:
            return []
        documents: list[Document] = []
        for collection_name in sorted(self._database.list_collection_names()):
            collection = self._database[collection_name]
            query = PUBLISHED_FILTER if collection_name == "benchmark_datasets" else {}
            for raw_document in collection.find(query).limit(self._settings.rag_max_documents_per_collection):
                if collection_name == "benchmark_datasets":
                    raw_document = official_benchmark(raw_document)
                    if raw_document is None:
                        continue
                document_id = str(raw_document.get("_id", "unknown"))
                raw_document.pop("_id", None)
                import json

                content = json.dumps(raw_document, ensure_ascii=False, default=str, indent=2)
                documents.append(
                    Document(
                        page_content=content,
                        metadata={
                            "source_type": "mongodb",
                            "source_collection": collection_name,
                            "source_document_id": document_id,
                            "source_id": make_source_id(
                                "mongo",
                                self._settings.rag_source_namespace,
                                self._settings.mongo_database_name,
                                collection_name,
                                document_id,
                            ),
                        },
                    )
                )
        return documents

    def _ensure_index(self) -> None:
        """Reconcile loaded sources, including changed content and chunking profiles."""
        documents_to_add: list[Document] = []

        # 1. Ingest Markdown Playbooks
        md_docs = self._load_markdown_documents()
        if md_docs:
            chunker = MarkdownHeaderChunker(settings=self._settings)
            md_chunks = chunker.split_documents(md_docs)
            documents_to_add.extend(md_chunks)

        # 2. Ingest MongoDB Documents (if available)
        mongo_docs = self._load_mongo_documents()
        if mongo_docs:
            text_chunker = StandardTextChunker(settings=self._settings)
            mongo_chunks = text_chunker.split_documents(mongo_docs)
            documents_to_add.extend(mongo_chunks)

        sync_source_chunks(self._vector_store, [*md_docs, *mongo_docs], documents_to_add)

    def retrieve(
        self,
        query: str,
        k: int | None = None,
        filter: dict[str, Any] | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Retrieve relevant context and citations from the Chroma vector store."""
        top_k = k or self._settings.rag_top_k
        matches = self._vector_store.similarity_search_with_relevance_scores(
            query,
            k=top_k,
            filter=filter,
        )

        context_parts: list[str] = []
        sources: list[dict[str, Any]] = []

        for document, score in matches:
            meta = document.metadata
            source_info = {
                **meta,
                "score": round(float(score), 4),
            }
            sources.append(source_info)

            # Construct clean citation header
            source_label = (
                meta.get("source_file") or meta.get("source_collection") or meta.get("source_type", "knowledge")
            )
            section_label = meta.get("section") or meta.get("title") or ""
            section_suffix = f" > {section_label}" if section_label else ""

            context_parts.append(
                f"[Source: {source_label}{section_suffix} | Relevance: {source_info['score']}]\n{source_text(document)}"
            )

        return "\n\n".join(context_parts), sources

    def close(self) -> None:
        try:
            if self._owns_embeddings and isinstance(self._embeddings, ResilientEmbeddingModel):
                self._embeddings.close()
        finally:
            if self._client is not None:
                self._client.close()

    async def aclose(self) -> None:
        try:
            if self._owns_embeddings and isinstance(self._embeddings, ResilientEmbeddingModel):
                await self._embeddings.aclose()
        finally:
            if self._client is not None:
                self._client.close()


# Backward-compatible alias
UnifiedRAGPipeline = MongoRAGPipeline


_PIPELINE_LOCK = threading.Lock()
_PIPELINE: MongoRAGPipeline | None = None
_PIPELINE_STOPPED = False


def start_rag_pipeline() -> None:
    """Allow lazy construction for a new application lifespan."""
    global _PIPELINE_STOPPED
    with _PIPELINE_LOCK:
        if _PIPELINE is not None:
            raise RuntimeError("RAG pipeline must be shut down before restarting")
        _PIPELINE_STOPPED = False


def get_rag_pipeline() -> MongoRAGPipeline:
    """Borrow the application-owned embedding instance; serialize initial indexing."""
    global _PIPELINE
    with _PIPELINE_LOCK:
        if _PIPELINE_STOPPED:
            raise RuntimeError("RAG pipeline is stopped")
        if _PIPELINE is None:
            _PIPELINE = MongoRAGPipeline(get_settings(), embeddings=get_embedding_model())
        return _PIPELINE


async def shutdown_rag_pipeline() -> None:
    """Release the cached pipeline without constructing it during shutdown."""
    global _PIPELINE, _PIPELINE_STOPPED
    # Construction includes synchronous indexing and can hold this lock for a while.
    # Do not block the event loop while waiting for it.
    import asyncio

    def stop():
        global _PIPELINE_STOPPED
        with _PIPELINE_LOCK:
            _PIPELINE_STOPPED = True
            return _PIPELINE

    instance = await asyncio.to_thread(stop)
    if instance is not None:
        await instance.aclose()
        with _PIPELINE_LOCK:
            if _PIPELINE is instance:
                _PIPELINE = None
