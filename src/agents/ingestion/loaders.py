from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml
from langchain_core.documents import Document
from pymongo import MongoClient

from src.config import Settings, get_settings

FRONTMATTER_REGEX = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
INLINE_METADATA_REGEX = re.compile(r"<!--\s*Metadata:\s*(.*?)\s*-->", re.IGNORECASE)


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
    except Exception:
        pass
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

    def __init__(self, directory_path: str | Path | None = None) -> None:
        self.directory_path = Path(directory_path) if directory_path else self._resolve_default_dir()

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
                raw_text = file_path.read_text(encoding="utf-8")
            except Exception:
                continue

            frontmatter, body = parse_yaml_frontmatter(raw_text)
            inline_meta = parse_inline_metadata(raw_text)

            rel_path = file_path.relative_to(self.directory_path).as_posix()
            folder_category = file_path.parent.name

            metadata: dict[str, Any] = {
                "source_type": "playbook",
                "source_file": rel_path,
                "folder_category": folder_category,
                "title": frontmatter.get("title") or file_path.stem,
                "source": frontmatter.get("source", "ROS2 Diagnostic Playbook"),
                "primary_fault_type": frontmatter.get("primary_fault_type") or inline_meta.get("fault_type", "Unknown"),
                "primary_layer": frontmatter.get("primary_layer") or inline_meta.get("layer", "Unknown"),
                "primary_action_type": frontmatter.get("primary_action_type") or inline_meta.get("action_type", "Unknown"),
            }

            documents.append(
                Document(
                    page_content=body.strip(),
                    metadata=metadata,
                )
            )

        return documents


class MongoDatasetLoader:
    """Loader for benchmark ground truth datasets and test cases stored in MongoDB."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def load(self) -> list[Document]:
        """Load benchmark datasets and format them as searchable Document objects."""
        if not self._settings.mongo_connection_string:
            return []

        try:
            client = MongoClient(
                self._settings.mongo_connection_string,
                serverSelectionTimeoutMS=self._settings.mongo_server_selection_timeout_ms,
            )
            database = client[self._settings.mongo_database_name]
            collection_names = database.list_collection_names()
        except Exception:
            return []

        documents: list[Document] = []

        try:
            # Benchmark datasets collection
            if "benchmark_datasets" in collection_names:
                collection = database["benchmark_datasets"]
                for doc in collection.find({}).limit(self._settings.rag_max_documents_per_collection):
                    code = str(doc.get("code", "unknown"))
                    name = str(doc.get("name", code))
                    test_cases = doc.get("test_cases", [])

                    # Create a summary document for the dataset
                    summary_content = (
                        f"Benchmark Dataset: {name} (Code: {code})\n"
                        f"Total test cases: {len(test_cases)}\n"
                        f"Fault type distribution: {json.dumps(doc.get('fault_type_distribution', {}), ensure_ascii=False)}"
                    )
                    documents.append(
                        Document(
                            page_content=summary_content,
                            metadata={
                                "source_type": "benchmark_summary",
                                "source_collection": "benchmark_datasets",
                                "dataset_code": code,
                                "dataset_name": name,
                            },
                        )
                    )

                    # Create individual documents for each test case for granular retrieval
                    for tc in test_cases:
                        tc_code = tc.get("code", "unknown")
                        topic = tc.get("topic", "")
                        label = tc.get("label", "nominal")
                        ground_truth = tc.get("ground_truth", {})
                        rosbag_name = tc.get("rosbag_name", "")
                        start_sec = tc.get("start_sec", 0.0)
                        end_sec = tc.get("end_sec", 0.0)

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
                                    "source_collection": "benchmark_datasets",
                                    "dataset_code": code,
                                    "test_case_code": tc_code,
                                    "topic": topic,
                                    "label": label,
                                    "primary_fault_type": label,
                                },
                            )
                        )
        finally:
            client.close()

        return documents
