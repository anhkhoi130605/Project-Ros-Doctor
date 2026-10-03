from __future__ import annotations

from functools import lru_cache
from typing import Any

from langchain_core.documents import Document
from pymongo import MongoClient

from src.agents.chunking.strategies import (
    MarkdownHeaderChunker,
    StandardTextChunker,
    generate_document_hash_id,
)
from src.agents.embedding.models import get_embedding_model
from src.agents.ingestion.loaders import MarkdownPlaybookLoader
from src.agents.vectordb.stores import get_chroma_store
from src.config import Settings, get_settings


class MongoRAGPipeline:
    """Unified RAG pipeline combining ROS2 Markdown playbooks and MongoDB benchmark data."""

    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
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

        self._embeddings = get_embedding_model(settings)
        self._vector_store = get_chroma_store(
            settings=settings,
            embedding_function=self._embeddings,
        )
        self._ensure_index()

    def _load_markdown_documents(self) -> list[Document]:
        loader = MarkdownPlaybookLoader()
        return loader.load()

    def _load_mongo_documents(self) -> list[Document]:
        if self._database is None:
            return []
        documents: list[Document] = []
        for collection_name in sorted(self._database.list_collection_names()):
            collection = self._database[collection_name]
            for raw_document in collection.find({}).limit(self._settings.rag_max_documents_per_collection):
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
                        },
                    )
                )
        return documents

    def _ensure_index(self) -> None:
        """Populate Chroma vector store with Playbooks and MongoDB docs if currently empty."""
        if self._vector_store._collection.count() > 0:
            return

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

        if not documents_to_add:
            return

        ids = [generate_document_hash_id(doc, idx) for idx, doc in enumerate(documents_to_add)]
        self._vector_store.add_documents(documents_to_add, ids=ids)

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
            source_label = meta.get("source_file") or meta.get("source_collection") or meta.get("source_type", "knowledge")
            section_label = meta.get("section") or meta.get("title") or ""
            section_suffix = f" > {section_label}" if section_label else ""

            context_parts.append(
                f"[Source: {source_label}{section_suffix} | Relevance: {source_info['score']}]\n"
                f"{document.page_content}"
            )

        return "\n\n".join(context_parts), sources

    def close(self) -> None:
        if self._client is not None:
            self._client.close()


# Backward-compatible alias
UnifiedRAGPipeline = MongoRAGPipeline


@lru_cache(maxsize=1)
def get_rag_pipeline() -> MongoRAGPipeline:
    return MongoRAGPipeline(get_settings())
