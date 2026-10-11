from __future__ import annotations

from functools import lru_cache
from typing import Any

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection

from src.config import Settings, get_settings
from src.models.schemas import BenchmarkDatasetResponse, BenchmarkDatasetSummary
from src.services.benchmark_publication import PUBLISHED_FILTER


class BenchmarkDatasetService:
    """Read-only access to benchmark datasets stored in MongoDB."""

    _SUMMARY_PROJECTION = {
        "_id": 0,
        "code": 1,
        "name": 1,
        "total_cases": 1,
    }
    _DETAIL_PROJECTION = {
        "_id": 0,
        "code": 1,
        "name": 1,
        "provenance": 1,
        "total_cases": 1,
        "group_distribution": 1,
        "fault_type_distribution": 1,
        "test_cases": 1,
        "created_at": 1,
    }

    def __init__(self, settings: Settings, collection: Collection | None = None) -> None:
        self._client: MongoClient | None = None
        if collection is not None:
            self._collection = collection
            return

        if not settings.mongo_connection_string:
            raise RuntimeError("MONGO_CONNECTION_STRING chưa được cấu hình")

        self._client = MongoClient(
            settings.mongo_connection_string,
            serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
            connectTimeoutMS=settings.mongo_connect_timeout_ms,
            socketTimeoutMS=settings.mongo_socket_timeout_ms,
            minPoolSize=settings.mongo_min_pool_size,
            maxPoolSize=settings.mongo_max_pool_size,
            retryReads=True,
            appname=settings.app_name,
        )
        self._collection = self._client[settings.mongo_database_name]["benchmark_datasets"]

    def list_datasets(self, limit: int = 50) -> list[BenchmarkDatasetSummary]:
        """Return lightweight summaries; test cases are intentionally excluded."""
        cursor = (
            self._collection.find(PUBLISHED_FILTER, self._SUMMARY_PROJECTION)
            .sort("code", ASCENDING)
            .limit(limit)
        )
        return [BenchmarkDatasetSummary.model_validate(document) for document in cursor]

    def get_dataset(self, code: str) -> BenchmarkDatasetResponse | None:
        """Return one dataset, using the indexed ``code`` field when available."""
        document: dict[str, Any] | None = self._collection.find_one(
            {"code": code, **PUBLISHED_FILTER},
            self._DETAIL_PROJECTION,
        )
        if document is None:
            return None

        if "total_cases" not in document:
            document["total_cases"] = len(document.get("test_cases", []))
        return BenchmarkDatasetResponse.model_validate(document)

    def close(self) -> None:
        if self._client is not None:
            self._client.close()


@lru_cache(maxsize=1)
def get_benchmark_dataset_service() -> BenchmarkDatasetService:
    return BenchmarkDatasetService(get_settings())
