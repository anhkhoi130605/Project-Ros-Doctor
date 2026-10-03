from __future__ import annotations

import hashlib
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from src.config import Settings, get_settings

DEFAULT_HEADERS_TO_SPLIT_ON = [
    ("#", "Header_1"),
    ("##", "Header_2"),
    ("###", "Header_3"),
]


def generate_document_hash_id(document: Document, fallback_index: int = 0) -> str:
    """Generate a deterministic SHA-256 ID based on metadata and content snippet."""
    meta = document.metadata
    source_key = (
        meta.get("source_file")
        or meta.get("dataset_code")
        or meta.get("source_document_id")
        or meta.get("source_type")
        or "unknown_source"
    )
    section_key = meta.get("section") or meta.get("Header_2") or meta.get("Header_1") or str(fallback_index)
    hash_payload = f"{source_key}::{section_key}::{fallback_index}::{document.page_content[:100]}"
    return hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()


class MarkdownHeaderChunker:
    """Hierarchical chunker that splits by Markdown headers and enriches sub-chunks with frontmatter."""

    def __init__(
        self,
        headers_to_split_on: list[tuple[str, str]] | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        settings: Settings | None = None,
    ) -> None:
        active_settings = settings or get_settings()
        self.headers_to_split_on = headers_to_split_on or DEFAULT_HEADERS_TO_SPLIT_ON
        self.chunk_size = chunk_size or active_settings.rag_chunk_size
        self.chunk_overlap = chunk_overlap or active_settings.rag_chunk_overlap

        self._header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=self.headers_to_split_on,
            strip_headers=False,
        )
        self._length_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )

    def split_document(self, document: Document) -> list[Document]:
        """Split a single Markdown document into header-based enriched chunks."""
        # 1. Split by Markdown headers
        header_chunks = self._header_splitter.split_text(document.page_content)
        if not header_chunks:
            # If no markdown headers found, treat entire content as single chunk
            header_chunks = [Document(page_content=document.page_content, metadata={})]

        # 2. Enrich chunks with original document metadata
        enriched_chunks: list[Document] = []
        for chunk in header_chunks:
            merged_meta: dict[str, Any] = {**document.metadata, **chunk.metadata}

            # Compose unified section name
            section_hierarchy = [
                chunk.metadata.get("Header_1"),
                chunk.metadata.get("Header_2"),
                chunk.metadata.get("Header_3"),
            ]
            valid_sections = [s for s in section_hierarchy if s]
            if valid_sections:
                merged_meta["section"] = " > ".join(valid_sections)

            enriched_chunks.append(
                Document(
                    page_content=chunk.page_content,
                    metadata=merged_meta,
                )
            )

        # 3. Apply secondary length splitting for oversized sections
        final_chunks: list[Document] = []
        for chunk in enriched_chunks:
            if len(chunk.page_content) > self.chunk_size:
                sub_chunks = self._length_splitter.split_documents([chunk])
                final_chunks.extend(sub_chunks)
            else:
                final_chunks.append(chunk)

        return final_chunks

    def split_documents(self, documents: list[Document]) -> list[Document]:
        """Split a list of documents into enriched chunks."""
        all_chunks: list[Document] = []
        for doc in documents:
            all_chunks.extend(self.split_document(doc))
        return all_chunks


class StandardTextChunker:
    """Standard recursive character text splitter for non-markdown or general text documents."""

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        settings: Settings | None = None,
    ) -> None:
        active_settings = settings or get_settings()
        self.chunk_size = chunk_size or active_settings.rag_chunk_size
        self.chunk_overlap = chunk_overlap or active_settings.rag_chunk_overlap
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )

    def split_documents(self, documents: list[Document]) -> list[Document]:
        return self._splitter.split_documents(documents)
