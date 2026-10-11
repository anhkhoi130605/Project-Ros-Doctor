"""Atomic publication of local Chroma source generations.

All readers/writers must use this adapter and the same manifest/lock directory.
A file lock serializes processes as well as threads. Queries may wait for ingestion;
they never observe staged generations. This is not a distributed Chroma protocol.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import tempfile
from pathlib import Path

from filelock import FileLock
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class RevisionedChroma:
    def __init__(self, store, manifest_path: str | Path):
        self._store = store
        self.manifest_path = Path(manifest_path)
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = FileLock(str(self.manifest_path) + ".lock")

    @property
    def _collection(self):
        return self._store._collection

    def _prepare_directory(self):
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)

    def _read_active(self) -> dict[str, str]:
        if not self.manifest_path.exists():
            return {}
        data = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or data.get("format") != 1 or not isinstance(data.get("active"), dict):
            raise ValueError("Invalid index revision manifest")
        active = data["active"]
        if any(not isinstance(key, str) or not isinstance(value, str) or not value for key, value in active.items()):
            raise ValueError("Invalid active source generations")
        return active

    def _publish(self, active: dict[str, str]):
        # Same-directory rename is the commit point. On any earlier failure readers
        # retain the previous manifest; partial staged chunks remain invisible.
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=self.manifest_path.parent, delete=False
            ) as output:
                temporary = output.name
                json.dump({"format": 1, "active": active}, output, sort_keys=True)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, self.manifest_path)
            temporary = None
        finally:
            if temporary is not None:
                Path(temporary).unlink(missing_ok=True)

    def publish_sources(self, groups: dict[str, list[tuple[str, Document]]], batch_size: int) -> int:
        with self._lock:
            self._prepare_directory()
            active = self._read_active()
            updated = dict(active)
            obsolete: list[str] = []
            for key, desired in groups.items():
                manifest = sorted((identity, chunk.metadata) for identity, chunk in desired)
                generation = hashlib.sha256(
                    json.dumps([key, manifest], sort_keys=True, ensure_ascii=False).encode()
                ).hexdigest()
                previous = self._store.get(where={"source_key": key}, include=["metadatas"])
                old = dict(zip(previous["ids"], previous["metadatas"], strict=True))
                staged = []
                desired_ids = set()
                for identity, chunk in desired:
                    storage_id = hashlib.sha256(f"{generation}:{identity}".encode()).hexdigest()
                    metadata = {**chunk.metadata, "index_generation": generation}
                    desired_ids.add(storage_id)
                    if old.get(storage_id) != metadata:
                        staged.append((storage_id, Document(page_content=chunk.page_content, metadata=metadata)))
                for start in range(0, len(staged), batch_size):
                    batch = staged[start : start + batch_size]
                    self._store.add_documents([chunk for _, chunk in batch], ids=[identity for identity, _ in batch])
                if desired:
                    updated[key] = generation
                else:
                    updated.pop(key, None)
                obsolete.extend(set(old) - desired_ids)
            if updated != active:
                self._publish(updated)
            # Cleanup is after publication. A failure here cannot expose the old
            # revision; the next ingest of these sources retries this cleanup.
            try:
                for start in range(0, len(obsolete), batch_size):
                    self._store.delete(ids=obsolete[start : start + batch_size])
            except Exception:
                logger.exception("Active revisions published; stale-chunk cleanup will be retried on ingestion")
            return sum(len(chunks) for chunks in groups.values())

    def _search(self, method: str, query: str, k: int, filter: dict | None, **kwargs):
        with self._lock:
            self._prepare_directory()
            active = list(self._read_active().values())
            if not active:
                return []
            allowed = {"index_generation": {"$in": active}}
            combined = {"$and": [allowed, filter]} if filter else allowed
            return getattr(self._store, method)(query, k=k, filter=combined, **kwargs)

    def similarity_search(self, query: str, k: int = 5, filter: dict | None = None, **kwargs):
        return self._search("similarity_search", query, k, filter, **kwargs)

    def similarity_search_with_relevance_scores(self, query: str, k: int = 5, filter: dict | None = None, **kwargs):
        return self._search("similarity_search_with_relevance_scores", query, k, filter, **kwargs)

    def get(self, **kwargs):
        """Administrative inspection includes staged/stale records; never use for retrieval."""
        with self._lock:
            self._prepare_directory()
            return self._store.get(**kwargs)

    def reset_collection(self):
        with self._lock:
            self._prepare_directory()
            self._store.reset_collection()
            self._publish({})
