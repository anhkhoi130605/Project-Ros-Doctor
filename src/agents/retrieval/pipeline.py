from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from typing import Any

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pymongo import MongoClient

from src.config import Settings, get_settings


class MongoRAGPipeline:
    """Load MongoDB collections into a persistent Chroma index and retrieve context."""

    def __init__(self, settings: Settings) -> None:
        if not settings.mongo_connection_string:
            raise RuntimeError("MONGO_CONNECTION_STRING chưa được cấu hình")
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY chưa được cấu hình")

        self._settings = settings
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
        self._embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
        )
        self._vector_store = Chroma(
            collection_name=settings.chroma_collection_name,
            embedding_function=self._embeddings,
            persist_directory=settings.chroma_persist_dir,
        )
        self._ensure_index()

    def _load_source_documents(self) -> list[Document]:
        documents: list[Document] = []
        for collection_name in sorted(self._database.list_collection_names()):
            collection = self._database[collection_name]
            for raw_document in collection.find({}).limit(self._settings.rag_max_documents_per_collection):
                document_id = str(raw_document.get("_id", "unknown"))
                raw_document.pop("_id", None)
                content = json.dumps(raw_document, ensure_ascii=False, default=str, indent=2)
                documents.append(
                    Document(
                        page_content=content,
                        metadata={
                            "source_collection": collection_name,
                            "source_document_id": document_id,
                        },
                    )
                )
        return documents

    def _split_documents(self, documents: list[Document]) -> list[Document]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._settings.rag_chunk_size,
            chunk_overlap=self._settings.rag_chunk_overlap,
        )
        return splitter.split_documents(documents)

    @staticmethod
    def _document_id(document: Document, index: int) -> str:
        source = f"{document.metadata.get('source_collection')}:{document.metadata.get('source_document_id')}:{index}"
        return hashlib.sha256(source.encode("utf-8")).hexdigest()

    def _ensure_index(self) -> None:
        if self._vector_store._collection.count() > 0:
            return
        documents = self._split_documents(self._load_source_documents())
        if not documents:
            return
        ids = [self._document_id(document, index) for index, document in enumerate(documents)]
        self._vector_store.add_documents(documents, ids=ids)

    def retrieve(self, query: str) -> tuple[str, list[dict[str, Any]]]:
        matches = self._vector_store.similarity_search_with_relevance_scores(
            query,
            k=self._settings.rag_top_k,
        )
        context_parts: list[str] = []
        sources: list[dict[str, Any]] = []
        for document, score in matches:
            source = {
                **document.metadata,
                "score": round(float(score), 4),
            }
            sources.append(source)
            context_parts.append(
                f"[Source: {source['source_collection']} / {source['source_document_id']}\n"
                f"Relevance: {source['score']}]\n{document.page_content}"
            )
        return "\n\n".join(context_parts), sources

    def close(self) -> None:
        self._client.close()


@lru_cache(maxsize=1)
def get_rag_pipeline() -> MongoRAGPipeline:
    return MongoRAGPipeline(get_settings())
