from unittest.mock import MagicMock

from src.models.schemas import BenchmarkDatasetResponse
from src.services.benchmark_dataset_service import BenchmarkDatasetService
from src.services.benchmark_publication import PUBLISHED_FILTER


def test_list_datasets_uses_summary_projection_and_limit():
    collection = MagicMock()
    collection.find.return_value.sort.return_value.limit.return_value = [
        {"code": "BENCHMARK-16-CURATED", "name": "Curated", "total_cases": 16}
    ]
    service = BenchmarkDatasetService(MagicMock(), collection=collection)

    result = service.list_datasets(limit=10)

    assert result[0].code == "BENCHMARK-16-CURATED"
    collection.find.assert_called_once_with(PUBLISHED_FILTER, service._SUMMARY_PROJECTION)
    collection.find.return_value.sort.assert_called_once_with("code", 1)
    collection.find.return_value.sort.return_value.limit.assert_called_once_with(10)


def test_get_dataset_uses_code_filter_and_detail_projection():
    collection = MagicMock()
    collection.find_one.return_value = {
        "code": "BENCHMARK-16-CURATED",
        "name": "Curated",
        "test_cases": [],
        "total_cases": 0,
    }
    service = BenchmarkDatasetService(MagicMock(), collection=collection)

    result = service.get_dataset("BENCHMARK-16-CURATED")

    assert isinstance(result, BenchmarkDatasetResponse)
    assert result.code == "BENCHMARK-16-CURATED"
    collection.find_one.assert_called_once_with(
        {"code": "BENCHMARK-16-CURATED", **PUBLISHED_FILTER},
        service._DETAIL_PROJECTION,
    )
