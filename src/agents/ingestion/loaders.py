from __future__ import annotations

import hashlib
import json
import logging
import re
from pathlib import Path
import re
from typing import Any

from langchain_core.documents import Document
from pymongo import MongoClient
import yaml

from src.agents.chunking.source import make_source_id
from src.config import Settings, get_settings

logger = logging.getLogger("src.agents.ingestion")

FRONTMATTER_REGEX = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
INLINE_METADATA_REGEX = re.compile(r"<!--\s*Metadata:\s*(.*?)\s*-->", re.DOTALL | re.IGNORECASE)


def parse_yaml_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Extract YAML frontmatter and remaining body text from Markdown."""
    match = FRONTMATTER_REGEX.match(text)
    if not match:
        return {}, text

    yaml_block = match.group(1)
    body = text[match.end() :]
    try:
        data = yaml.safe_load(yaml_block) or {}
        if isinstance(data, dict):
            return data, body
    except Exception as exc:
        logger.warning("Error parsing YAML frontmatter: %s", exc)
    return {}, text


def parse_inline_metadata(text: str) -> dict[str, str]:
    """Extract key-value pairs from inline comments like <!-- Metadata: K=V | ... -->."""
    meta: dict[str, str] = {}
    for match in INLINE_METADATA_REGEX.finditer(text):
        raw_items = match.group(1).split("|")
        for item in raw_items:
            if "=" in item:
                key, val = item.split("=", 1)
                meta[key.strip().lower()] = val.strip()
    return meta


class MarkdownPlaybookLoader:
    """Loader for ROS2 diagnostic playbooks and specification Markdown files."""

    def __init__(self, directory_path: str | Path | None = None, namespace: str | None = None) -> None:
        self.directory_path = Path(directory_path) if directory_path else self._resolve_default_dir()
        # Default namespace is consistent across machines (relative project path or explicit config)
        self.namespace = namespace or get_settings().rag_source_namespace

    @staticmethod
    def _resolve_default_dir() -> Path:
        candidates = [
            Path(__file__).resolve().parent.parent.parent / "Rag_knowledge",
            Path(__file__).resolve().parent.parent.parent / "Rag_knowleged",
            Path("D:/katzensee_d/rag_knowledge/clean"),
            Path("D:/katzensee_d/rag_knowledge"),
        ]
        for c in candidates:
            if c.exists():
                return c
        return candidates[0]

    def load(self) -> list[Document]:
        """Read all markdown files, extract metadata, and produce Document objects."""
        if not self.directory_path.exists():
            return []

        documents: list[Document] = []
        for file_path in sorted(self.directory_path.rglob("*.md")):
            try:
                with file_path.open(encoding="utf-8", newline="") as source:
                    raw_text = source.read()
            except Exception as exc:
                logger.error("Failed to read playbook file %s: %s", file_path, exc)
                continue

            frontmatter, body = parse_yaml_frontmatter(raw_text)
            inline_meta = parse_inline_metadata(raw_text)

            rel_path = file_path.relative_to(self.directory_path).as_posix()
            folder_category = file_path.parent.name

            metadata: dict[str, Any] = {
                "source_type": "playbook",
                "source_file": rel_path,
                "source_id": make_source_id("markdown", self.namespace, rel_path),
                "source_offset": len(raw_text) - len(body),
                "source_revision": hashlib.sha256(raw_text.encode("utf-8")).hexdigest(),
                "folder_category": folder_category,
                "title": str(frontmatter.get("title") or file_path.stem),
                "source": str(frontmatter.get("source", "ROS2 Diagnostic Playbook")),
                "primary_fault_type": str(frontmatter.get("primary_fault_type") or inline_meta.get("fault_type", "Unknown")),
                "primary_layer": str(frontmatter.get("primary_layer") or inline_meta.get("layer", "Unknown")),
                "primary_action_type": str(
                    frontmatter.get("primary_action_type") or inline_meta.get("action_type", "Unknown")
                ),
            }

            documents.append(
                Document(
                    page_content=body,
                    metadata=metadata,
                )
            )

        return documents


class MongoDatasetLoader:
    """Loader for benchmark ground truth datasets and test cases stored in MongoDB.

    Safely handles connection lifecycles, validates data types, limits test case bounds,
    and constructs stable deterministic source revisions.
    """

    def __init__(self, settings: Settings | None = None, max_cases_per_dataset: int = 500) -> None:
        self._settings = settings or get_settings()
        self._max_cases_per_dataset = max(1, max_cases_per_dataset)

    def load(self) -> list[Document]:
        """Load benchmark datasets and format them as searchable Document objects."""
        if not self._settings.mongo_connection_string:
            return []

        client: MongoClient | None = None
        documents: list[Document] = []

        try:
            client = MongoClient(
                self._settings.mongo_connection_string,
                serverSelectionTimeoutMS=self._settings.mongo_server_selection_timeout_ms,
            )
            database = client[self._settings.mongo_database_name]
            collection_names = database.list_collection_names()

            if "benchmark_datasets" not in collection_names:
                logger.info("Collection 'benchmark_datasets' not found in MongoDB database '%s'", self._settings.mongo_database_name)
                return []

            collection = database["benchmark_datasets"]
            # Deterministic ascending sort by code prevents index instability across runs
            cursor = collection.find({}).sort("code", 1).limit(self._settings.rag_max_documents_per_collection)

            for doc in cursor:
                if not isinstance(doc, dict):
                    continue

                code = str(doc.get("code", "unknown")).strip()
                name = str(doc.get("name", code)).strip()
                raw_test_cases = doc.get("test_cases", [])
                test_cases = raw_test_cases if isinstance(raw_test_cases, list) else []

                # Compute deterministic document revision hash
                raw_snapshot = json.dumps(doc, sort_keys=True, default=str, ensure_ascii=False)
                dataset_revision = hashlib.sha256(raw_snapshot.encode("utf-8")).hexdigest()

                # 1. Summary Document
                fault_distribution = doc.get("fault_type_distribution", {})
                if not isinstance(fault_distribution, dict):
                    fault_distribution = {}

                summary_content = (
                    f"Benchmark Dataset: {name} (Code: {code})\n"
                    f"Total test cases: {len(test_cases)}\n"
                    f"Fault type distribution: {json.dumps(fault_distribution, ensure_ascii=False)}"
                )
                documents.append(
                    Document(
                        page_content=summary_content,
                        metadata={
                            "source_type": "benchmark_summary",
                            "source_id": make_source_id(
                                "mongo",
                                self._settings.rag_source_namespace,
                                self._settings.mongo_database_name,
                                "benchmark_datasets",
                                code,
                                "summary",
                            ),
                            "source_collection": "benchmark_datasets",
                            "source_revision": dataset_revision,
                            "dataset_code": code,
                            "dataset_name": name,
                        },
                    )
                )

                # 2. Granular Test Cases (bounded by max_cases_per_dataset)
                for tc in test_cases[: self._max_cases_per_dataset]:
                    if not isinstance(tc, dict):
                        continue

                    tc_code = str(tc.get("code", "unknown")).strip()
                    topic = str(tc.get("topic", "")).strip()
                    label = str(tc.get("label", "nominal")).strip()
                    ground_truth = tc.get("ground_truth", {})
                    if not isinstance(ground_truth, dict):
                        ground_truth = {"raw": str(ground_truth)}

                    rosbag_name = str(tc.get("rosbag_name", "")).strip()
                    try:
                        start_sec = float(tc.get("start_sec", 0.0))
                    except (ValueError, TypeError):
                        start_sec = 0.0
                    try:
                        end_sec = float(tc.get("end_sec", 0.0))
                    except (ValueError, TypeError):
                        end_sec = 0.0

                    tc_content = (
                        f"Benchmark Case: {tc_code} (Dataset: {code})\n"
                        f"Rosbag: {rosbag_name} | Affected Topic: {topic}\n"
                        f"Fault Window: {start_sec}s - {end_sec}s | Label: {label}\n"
                        f"Ground Truth Details: {json.dumps(ground_truth, ensure_ascii=False, default=str)}"
                    )

                    documents.append(
                        Document(
                            page_content=tc_content,
                            metadata={
                                "source_type": "benchmark_case",
                                "source_id": make_source_id(
                                    "mongo",
                                    self._settings.rag_source_namespace,
                                    self._settings.mongo_database_name,
                                    "benchmark_datasets",
                                    code,
                                    "case",
                                    tc_code,
                                ),
                                "source_collection": "benchmark_datasets",
                                "source_revision": dataset_revision,
                                "dataset_code": code,
                                "test_case_code": tc_code,
                                "topic": topic,
                                "label": label,
                                "primary_fault_type": label,
                            },
                        )
                    )
        except Exception:
            logger.exception(
                 "Failed to load benchmark datasets from MongoDB"
                )
            raise
        finally:
            if client is not None:
                client.close()

        return documents
