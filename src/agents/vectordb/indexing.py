"""Validate complete source snapshots before replacing their indexed chunks.

Managed Chroma stores stage and publish generations under a local file lock.
Raw stores retain retryable, single-writer upsert/delete reconciliation only.
Sources absent from an input batch are deliberately not deleted.
"""

from __future__ import annotations

from collections import defaultdict

from langchain_core.documents import Document

from src.agents.chunking.source import nonnegative_int, source_key, source_revision, source_text
from src.agents.chunking.strategies import prepare_chunks_for_index
from src.agents.vectordb.revisions import RevisionedChroma


def _source_snapshots(sources: list[Document]) -> dict[str, list[Document]]:
    grouped: dict[str, list[Document]] = defaultdict(list)
    for source in sources:
        key = source_key(source)
        if source not in grouped[key]:
            grouped[key].append(source)
    for parts in grouped.values():
        revisions = {source_revision(part) for part in parts}
        if len(revisions) != 1:
            raise ValueError("Conflicting revisions of the same source in one ingestion batch")
        fragmented = any("source_part_count" in part.metadata or "source_part_index" in part.metadata for part in parts)
        if not fragmented:
            if len(parts) != 1:
                raise ValueError("Multiple Documents per source require source_part_index/count and a shared revision")
            continue
        count = nonnegative_int(parts[0].metadata, "source_part_count")
        if count < 1 or len(parts) != count:
            raise ValueError("Incomplete source snapshot: all source parts must be supplied together")
        indices = set()
        previous_end = -1
        for part in sorted(parts, key=lambda item: nonnegative_int(item.metadata, "source_offset")):
            if "source_part_index" not in part.metadata or "source_offset" not in part.metadata:
                raise ValueError("Source parts require explicit source_part_index and source_offset")
            if nonnegative_int(part.metadata, "source_part_count") != count:
                raise ValueError("Inconsistent source_part_count")
            indices.add(nonnegative_int(part.metadata, "source_part_index"))
            start = nonnegative_int(part.metadata, "source_offset")
            if start < previous_end:
                raise ValueError("Source parts must not overlap")
            previous_end = start + len(part.page_content)
        if indices != set(range(count)):
            raise ValueError("source_part_index must cover every part exactly once")
    return grouped


def _validate_chunk_coverage(parts: list[Document], desired: list[tuple[str, Document]]):
    """Reject missing/stale/wrong-source chunks before publishing or deleting anything."""
    expected_revision = source_revision(parts[0])
    covered: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for _, chunk in desired:
        if chunk.metadata.get("source_revision") != expected_revision:
            raise ValueError("Chunk source_revision does not match the authoritative source snapshot")
        if chunk.metadata.get("source_key") != source_key(chunk):
            raise ValueError("Chunk source_key does not match source identity")
        if "index_generation" in chunk.metadata:
            raise ValueError("index_generation is reserved for the publication layer")
        start = nonnegative_int(chunk.metadata, "source_start")
        end = nonnegative_int(chunk.metadata, "source_end")
        for index, part in enumerate(parts):
            base = nonnegative_int(part.metadata, "source_offset")
            if base <= start < end <= base + len(part.page_content):
                if source_text(chunk) != part.page_content[start - base : end - base]:
                    raise ValueError("Chunk text differs from the authoritative source slice")
                covered[index].append((start - base, end - base))
                break
        else:
            raise ValueError("Chunk offsets lie outside all source parts")
    for index, part in enumerate(parts):
        if not part.page_content.strip():
            continue
        cursor = 0
        for start, end in sorted(covered[index]):
            if start > cursor:
                raise ValueError("Incomplete chunks: source coverage has a gap")
            cursor = max(cursor, end)
        if cursor != len(part.page_content):
            raise ValueError("Incomplete chunks: source coverage is missing")


def sync_source_chunks(store, sources: list[Document], chunks: list[Document], batch_size: int = 50) -> int:
    if isinstance(batch_size, bool) or not isinstance(batch_size, int) or batch_size <= 0:
        raise ValueError("batch_size must be a positive integer")
    snapshots = _source_snapshots(sources)
    unique, ids = prepare_chunks_for_index(chunks)
    groups: dict[str, list[tuple[str, Document]]] = defaultdict(list)
    for identity, chunk in zip(ids, unique, strict=True):
        key = source_key(chunk)
        if key not in snapshots:
            raise ValueError("Chunk source is not in the authoritative input batch")
        groups[key].append((identity, chunk))

    for key, parts in snapshots.items():
        _validate_chunk_coverage(parts, groups[key])
    if isinstance(store, RevisionedChroma):
        return store.publish_sources(dict(groups), batch_size)

    # Compatibility for explicitly supplied raw stores: single-writer reconciliation
    # only. Production factory returns RevisionedChroma with guarded publication.
    for key in snapshots:
        previous = store.get(where={"source_key": key}, include=["metadatas"])
        old = dict(zip(previous["ids"], previous["metadatas"], strict=True))
        desired = groups[key]
        changed = [(identity, chunk) for identity, chunk in desired if old.get(identity) != chunk.metadata]
        for start in range(0, len(changed), batch_size):
            batch = changed[start : start + batch_size]
            store.add_documents([chunk for _, chunk in batch], ids=[identity for identity, _ in batch])
        stale = sorted(set(old) - {identity for identity, _ in desired})
        for start in range(0, len(stale), batch_size):
            store.delete(ids=stale[start : start + batch_size])
    return len(unique)
