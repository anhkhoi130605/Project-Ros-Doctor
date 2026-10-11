from __future__ import annotations

import hashlib
import json
import logging
import math
from collections import Counter
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import tiktoken
from langchain_core.documents import Document

from src.agents.chunking.budget import split_spans
from src.agents.chunking.markdown import markdown_sections
from src.agents.chunking.source import nonnegative_int, require_source_id, source_key, source_revision, source_text
from src.config import Settings, get_settings

DEFAULT_HEADERS_TO_SPLIT_ON = [("#", "Header_1"), ("##", "Header_2"), ("###", "Header_3")]
CHUNKING_VERSION = "3"
CHUNKING_ALGORITHM_REVISION = "3.1"
logger = logging.getLogger(__name__)


def get_token_counter(encoding_name: str = "cl100k_base", model_name: str | None = None) -> Callable[[str], int]:
    """Count ordinary text, including literal strings resembling special tokens."""
    try:
        encoding = (
            tiktoken.encoding_for_model(model_name) if model_name is not None else tiktoken.get_encoding(encoding_name)
        )
    except (KeyError, ValueError) as exc:
        raise ValueError(f"Unsupported model or encoding: {model_name or encoding_name}") from exc

    def count_tokens(text: str) -> int:
        if not isinstance(text, str):
            raise TypeError("Input must be a string.")
        return len(encoding.encode_ordinary(text))

    return count_tokens


def generate_document_hash_id(document: Document, fallback_index: int = 0) -> str:
    """ID of the indexed representation, its source revision, offsets and chunking profile.

    fallback_index remains accepted but is ignored. Batch order is not identity.
    Identity values must be explicitly typed; arbitrary object repr is never hashed.
    """
    meta = document.metadata
    strings = []
    for name in ("section", "source_revision", "chunking_version", "chunking_profile"):
        value = meta.get(name, CHUNKING_VERSION if name == "chunking_version" else "")
        if not isinstance(value, str):
            raise ValueError(f"Identity metadata {name} must be a string")
        strings.append(value)
    payload = [
        source_key(document),
        strings,
        document.page_content,
        nonnegative_int(meta, "chunk_occurrence"),
        nonnegative_int(meta, "source_start"),
        nonnegative_int(meta, "source_end"),
    ]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def prepare_chunks_for_index(chunks: list[Document]) -> tuple[list[Document], list[str]]:
    """Deduplicate identical representations; reject unsupported vector metadata clearly."""
    unique: dict[str, Document] = {}
    for chunk in chunks:
        identity = generate_document_hash_id(chunk)
        for key, value in chunk.metadata.items():
            if not isinstance(value, (str, int, float, bool)) or (
                isinstance(value, float) and not math.isfinite(value)
            ):
                raise ValueError(f"Index metadata {key} must be a finite scalar string/number/bool")
        previous = unique.get(identity)
        if previous is not None and previous.metadata != chunk.metadata:
            raise ValueError("Conflicting metadata for the same chunk ID")
        unique.setdefault(identity, chunk)
    return list(unique.values()), list(unique)


def _resolve_chunk_settings(chunk_size: int | None, chunk_overlap: int | None, settings: Settings) -> tuple[int, int]:
    size = settings.rag_chunk_size if chunk_size is None else chunk_size
    overlap = settings.rag_chunk_overlap if chunk_overlap is None else chunk_overlap
    if isinstance(size, bool) or not isinstance(size, int) or size <= 0:
        raise ValueError("chunk_size must be a positive integer greater than 0")
    if isinstance(overlap, bool) or not isinstance(overlap, int) or overlap < 0:
        raise ValueError("chunk_overlap must be a non-negative integer")
    if overlap >= size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")
    return size, overlap


def _split_with_budget(text: str, size: int, overlap: int, length: Callable[[str], int], prefix: str = "") -> list[str]:
    """Compatibility helper; split_spans supplies source offsets and boundary metrics."""
    return [prefix + text[span.start : span.end] for span in split_spans(text, size, overlap, length, prefix)]


def _index_chunks(chunks: list[Document], unit: str) -> list[Document]:
    occurrences: Counter[tuple[str, str]] = Counter()
    for index, chunk in enumerate(chunks):
        key = (chunk.metadata.get("section", ""), source_text(chunk))
        chunk.metadata.update(
            chunk_index=index,
            total_chunks=len(chunks),
            chunk_occurrence=occurrences[key],
            chunking_version=CHUNKING_VERSION,
            chunk_unit=unit,
        )
        occurrences[key] += 1
    fallbacks = sum(chunk.metadata["split_boundary"] == "unicode" for chunk in chunks)
    if fallbacks:
        logger.info("Chunking required %d Unicode-boundary splits across %d chunks", fallbacks, len(chunks))
    return chunks


class StandardTextChunker:
    """Lossless source slices with bounded indexed representations and per-source indices."""

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        settings: Settings | None = None,
        use_token_length: bool | None = None,
    ) -> None:
        settings = settings or get_settings()
        self.chunk_size, self.chunk_overlap = _resolve_chunk_settings(chunk_size, chunk_overlap, settings)
        self.use_token_length = settings.rag_chunk_unit == "tokens" if use_token_length is None else use_token_length
        self._embedding_limit = settings.rag_embedding_max_tokens
        if self._embedding_limit is not None and (
            isinstance(self._embedding_limit, bool)
            or not isinstance(self._embedding_limit, int)
            or self._embedding_limit <= 0
        ):
            raise ValueError("rag_embedding_max_tokens must be a positive integer or None")
        # Known tiktoken models have a verifiable mapping. Unknown providers remain
        # explicitly measured by the configured tokenizer, not a claimed model limit.
        try:
            expected_encoding = tiktoken.encoding_name_for_model(settings.embedding_model)
        except KeyError:
            logger.warning(
                "Unknown embedding tokenizer for %s; budget uses %s",
                settings.embedding_model,
                settings.rag_token_encoding,
            )
        else:
            if expected_encoding != settings.rag_token_encoding:
                raise ValueError(f"rag_token_encoding must be {expected_encoding} for {settings.embedding_model}")
        self._token_length = get_token_counter(settings.rag_token_encoding)
        self._length_func = self._token_length if self.use_token_length else len
        self._effective_size = (
            min(self.chunk_size, self._embedding_limit)
            if (self.use_token_length and self._embedding_limit is not None)
            else self.chunk_size
        )
        self._profile_settings = [
            CHUNKING_VERSION,
            CHUNKING_ALGORITHM_REVISION,
            self.chunk_size,
            self.chunk_overlap,
            self.use_token_length,
            settings.rag_token_encoding,
            self._embedding_limit,
            settings.embedding_model,
        ]

    def _metadata(self, document: Document) -> dict:
        require_source_id(document)
        metadata = dict(document.metadata)
        metadata["source_key"] = source_key(document)
        # Upstream labels are distinct from headings parsed from the current text.
        if "section" in metadata:
            metadata["source_section"] = metadata.pop("section")
        for name in list(metadata):
            if name.startswith("Header_") or name in (
                "markdown_section",
                "chunk_index",
                "total_chunks",
                "chunk_occurrence",
                "context_prefix",
                "source_start",
                "source_end",
                "split_boundary",
            ):
                metadata.pop(name)
        metadata["source_revision"] = source_revision(document)
        return metadata

    def _emit(self, text: str, offset: int, metadata: dict, prefix: str = "") -> list[Document]:
        profile = [*self._profile_settings, type(self).__name__, prefix]
        metadata = {**metadata, "chunking_profile": hashlib.sha256(json.dumps(profile).encode()).hexdigest()}
        chunks = []
        for span in split_spans(
            text,
            self._effective_size,
            min(self.chunk_overlap, self._effective_size - 1),
            self._length_func,
            prefix,
        ):
            representation = prefix + text[span.start : span.end]
            if self._embedding_limit is not None and self._token_length(representation) > self._embedding_limit:
                raise ValueError(
                    "Chunk exceeds rag_embedding_max_tokens; use token units or reduce the character budget"
                )
            chunks.append(
                Document(
                    page_content=representation,
                    metadata={
                        **metadata,
                        "source_start": offset + span.start,
                        "source_end": offset + span.end,
                        "context_prefix": prefix,
                        "split_boundary": span.boundary,
                    },
                )
            )
        return chunks

    def split_document(self, document: Document) -> list[Document]:
        metadata = self._metadata(document)
        if not document.page_content.strip():
            return []
        chunks = self._emit(document.page_content, nonnegative_int(document.metadata, "source_offset"), metadata)
        return _index_chunks(chunks, "tokens" if self.use_token_length else "characters")

    def split_documents(self, documents: list[Document]) -> list[Document]:
        return [chunk for document in documents for chunk in self.split_document(document)]

    def split_documents_parallel(self, documents: list[Document], max_workers: int | None = None) -> list[Document]:
        """Parallel chunking across multiple documents using a thread pool."""
        if not documents:
            return []
        if len(documents) == 1:
            return self.split_document(documents[0])

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            nested = list(executor.map(self.split_document, documents))
        return [chunk for doc_chunks in nested for chunk in doc_chunks]


class MarkdownHeaderChunker(StandardTextChunker):
    """Recognize ATX headings without rewriting source text, including code indentation."""

    def __init__(
        self,
        headers_to_split_on: list[tuple[str, str]] | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        settings: Settings | None = None,
        use_token_length: bool | None = None,
        prefix_section_context: bool = True,
    ) -> None:
        super().__init__(chunk_size, chunk_overlap, settings, use_token_length)
        self.headers_to_split_on = list(
            DEFAULT_HEADERS_TO_SPLIT_ON if headers_to_split_on is None else headers_to_split_on
        )
        markdown_sections("", self.headers_to_split_on)  # Validate even before the first document.
        self.prefix_section_context = prefix_section_context
        self._profile_settings.extend([self.headers_to_split_on, prefix_section_context])

    def split_document(self, document: Document) -> list[Document]:
        metadata = self._metadata(document)
        for _, name in self.headers_to_split_on:
            metadata.pop(name, None)
        if not document.page_content.strip():
            return []
        base_offset = nonnegative_int(document.metadata, "source_offset")
        chunks = []
        for section in markdown_sections(document.page_content, self.headers_to_split_on):
            section_meta = {**metadata, **section.headings}
            title = " > ".join(value for value in section.headings.values() if value)
            if title:
                section_meta.update(section=title, markdown_section=title)

            prefix = ""
            if self.prefix_section_context and title:
                max_prefix_len = self._effective_size // 4
                if self._length_func(f"[{title}]\n\n") <= max_prefix_len:
                    prefix = f"[{title}]\n\n"
                else:
                    # If breadcrumb is too long, keep the leaf section heading if it fits
                    leaf_heading = list(section.headings.values())[-1] if section.headings else ""
                    if leaf_heading and self._length_func(f"[{leaf_heading}]\n\n") <= max_prefix_len:
                        prefix = f"[{leaf_heading}]\n\n"

            chunks.extend(
                self._emit(
                    document.page_content[section.start : section.end],
                    base_offset + section.start,
                    section_meta,
                    prefix,
                )
            )
        return _index_chunks(chunks, "tokens" if self.use_token_length else "characters")
