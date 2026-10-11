"""Strict source identity and exact quotation of indexed representations."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from langchain_core.documents import Document


def make_source_id(*parts: str) -> str:
    """Encode a namespace and locator without ambiguous delimiter concatenation."""
    if not parts or any(not isinstance(part, str) or not part.strip() for part in parts):
        raise ValueError("source_id components must be non-empty strings")
    return json.dumps(parts, ensure_ascii=False, separators=(",", ":"))


def require_source_id(document: Document) -> str:
    value = document.metadata.get("source_id")
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Every document must have a non-empty string source_id; normalize identity in the loader")
    return value


def source_revision(document: Document) -> str:
    """Trusted loader revision of the complete logical source, never a fragment hash.

    Without a supplied revision the Document must represent a complete source.
    Fragmented loaders supply revision, source_part_index/count and source_offset.
    This validates the revision's schema, not the upstream authority's authenticity.
    """
    value = document.metadata.get("source_revision")
    if "source_revision" in document.metadata:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("source_revision must be a non-empty string from the source loader")
        return value
    if "source_part_count" in document.metadata or "source_part_index" in document.metadata:
        raise ValueError("Fragmented sources require an explicit source_revision for the whole document")
    return hashlib.sha256(document.page_content.encode("utf-8")).hexdigest()


def source_key(document: Document) -> str:
    identity = [require_source_id(document)]
    for name in ("namespace", "tenant_id"):
        value = document.metadata.get(name, "")
        if not isinstance(value, str):
            raise ValueError(f"Identity metadata {name} must be a string")
        identity.append(value)
    return hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode("utf-8")).hexdigest()


def nonnegative_int(metadata: dict[str, Any], field: str, default: int = 0) -> int:
    value = metadata.get(field, default)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"Metadata {field} must be a non-negative integer")
    return value


def source_text(document: Document) -> str:
    """Remove only the explicitly recorded synthetic prefix, never infer it from text."""
    prefix = document.metadata.get("context_prefix", "")
    if not isinstance(prefix, str) or not document.page_content.startswith(prefix):
        raise ValueError("Invalid context_prefix metadata for indexed document")
    return document.page_content[len(prefix) :]
