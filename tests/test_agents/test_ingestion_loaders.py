from pathlib import Path
from unittest.mock import MagicMock
import pytest

from src.agents.ingestion.loaders import (
    MarkdownPlaybookLoader,
    MongoDatasetLoader,
    parse_inline_metadata,
    parse_yaml_frontmatter,
)
from src.config import Settings


def test_parse_yaml_frontmatter():
    text = """---
title: "Sample Playbook"
primary_fault_type: "TF_Inconsistency"
primary_layer: "ROS2_Middleware"
---
# Main Content
This is the body.
"""
    meta, body = parse_yaml_frontmatter(text)
    assert meta["title"] == "Sample Playbook"
    assert meta["primary_fault_type"] == "TF_Inconsistency"
    assert meta["primary_layer"] == "ROS2_Middleware"
    assert "# Main Content" in body


def test_parse_yaml_frontmatter_no_frontmatter():
    text = "# Just markdown\nNo yaml here."
    meta, body = parse_yaml_frontmatter(text)
    assert meta == {}
    assert body == text


def test_parse_inline_metadata():
    text = "Some text <!-- Metadata: Fault_Type=Topic_Dropout | Layer=DDS_Middleware | Action=Reboot --> more text"
    meta = parse_inline_metadata(text)
    assert meta["fault_type"] == "Topic_Dropout"
    assert meta["layer"] == "DDS_Middleware"
    assert meta["action"] == "Reboot"


def test_markdown_playbook_loader_loads_real_files():
    loader = MarkdownPlaybookLoader()
    docs = loader.load()
    assert len(docs) > 0

    first_doc = docs[0]
    assert "source_type" in first_doc.metadata
    assert first_doc.metadata["source_type"] == "playbook"
    assert "primary_fault_type" in first_doc.metadata
    assert "primary_layer" in first_doc.metadata
    assert len(first_doc.page_content) > 0


def test_markdown_playbook_loader_nonexistent_dir(tmp_path: Path):
    loader = MarkdownPlaybookLoader(directory_path=tmp_path / "nonexistent")
    docs = loader.load()
    assert docs == []


def test_mongo_dataset_loader_with_mock():
    mock_settings = Settings(
        mongo_connection_string="mongodb://fake:27017",
        openai_api_key="test-key",
    )
    loader = MongoDatasetLoader(settings=mock_settings)

    mock_client = MagicMock()
    mock_db = MagicMock()
    mock_client.__getitem__.return_value = mock_db
    mock_db.list_collection_names.return_value = ["benchmark_datasets"]

    mock_coll = MagicMock()
    mock_db.__getitem__.return_value = mock_coll
    # find().sort().limit()
    mock_coll.find.return_value.sort.return_value.limit.return_value = [
        {
            "code": "BENCHMARK-TEST",
            "name": "Test Benchmark",
            "fault_type_distribution": {"drop": 1},
            "test_cases": [
                {
                    "code": "CASE-01",
                    "topic": "/odom",
                    "label": "drift",
                    "start_sec": 1.0,
                    "end_sec": 5.0,
                    "ground_truth": {"drift": True},
                }
            ],
        }
    ]

    import unittest.mock as mock

    with mock.patch("src.agents.ingestion.loaders.MongoClient", return_value=mock_client):
        docs = loader.load()
        assert len(docs) == 2  # 1 summary + 1 test case
        assert docs[0].metadata["source_type"] == "benchmark_summary"
        assert docs[0].metadata["source_revision"] is not None
        assert docs[1].metadata["source_type"] == "benchmark_case"
        assert docs[1].metadata["test_case_code"] == "CASE-01"
        assert docs[1].metadata["source_revision"] is not None
        mock_client.close.assert_called_once()


def test_mongo_dataset_loader_handles_corrupt_records():
    mock_settings = Settings(
        mongo_connection_string="mongodb://fake:27017",
        openai_api_key="test-key",
    )
    loader = MongoDatasetLoader(settings=mock_settings, max_cases_per_dataset=1)

    mock_client = MagicMock()
    mock_db = MagicMock()
    mock_client.__getitem__.return_value = mock_db
    mock_db.list_collection_names.return_value = ["benchmark_datasets"]

    mock_coll = MagicMock()
    mock_db.__getitem__.return_value = mock_coll
    # Contains non-dict and corrupt records
    mock_coll.find.return_value.sort.return_value.limit.return_value = [
        "not-a-dict",
        {
            "code": "CORRUPT-TEST",
            "test_cases": "not-a-list",
        },
        {
            "code": "VALID-TEST",
            "test_cases": [
                {"code": "C1", "start_sec": "bad_float", "ground_truth": "string_truth"},
                {"code": "C2"},  # Exceeds max_cases_per_dataset=1
            ],
        },
    ]

    import unittest.mock as mock

    with mock.patch("src.agents.ingestion.loaders.MongoClient", return_value=mock_client):
        docs = loader.load()
        # Summary for CORRUPT-TEST + Summary for VALID-TEST + 1 test case (C1)
        assert len(docs) == 3
        mock_client.close.assert_called_once()
