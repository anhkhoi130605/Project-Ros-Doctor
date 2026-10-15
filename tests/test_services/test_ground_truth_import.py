import copy
from unittest.mock import MagicMock

import pytest

from scripts.import_ground_truth_pair import apply_import, build_cases


def sample():
    document = {"_id": "id", "code": "TEST", "version": 1, "is_published": True,
                "test_cases": [{"code": "case_11", "ground_truth": "legacy", "other": "preserve"}]}
    normalized = [{"caseId": "case_11", "groundTruthDetail": {"schema_version": 1}}]
    return document, normalized


def test_import_is_additive_and_requires_exact_case_set():
    document, normalized = sample()
    before = copy.deepcopy(document)
    rows = build_cases(document, normalized)
    assert rows[0]["other"] == "preserve" and rows[0]["ground_truth"] == "legacy"
    assert document == before
    with pytest.raises(ValueError):
        build_cases(document, [])
    with pytest.raises(ValueError):
        build_cases({**document, "change_request": {"status": "Pending"}}, normalized)
    with pytest.raises(ValueError):
        build_cases({**document, "is_published": False}, normalized)


def test_import_backup_cas_and_idempotency(tmp_path):
    document, normalized = sample()
    rows = build_cases(document, normalized)
    collection = MagicMock()
    collection.update_one.return_value.modified_count = 1
    result = apply_import(collection, document, rows, [], tmp_path, 1)
    assert result["version"] == 2
    assert len(list(tmp_path.glob("benchmark-before-*.json"))) == 1
    selector, update = collection.update_one.call_args.args
    assert selector["test_cases"] == document["test_cases"]
    assert selector["version"] == 1
    assert selector["change_request"] is None
    assert "change_request" not in update["$set"]
    assert collection.update_one.call_args.kwargs["upsert"] is False
    collection.reset_mock()
    assert apply_import(collection, {**document, "test_cases": rows}, rows, [], tmp_path, 1)["status"] == "unchanged"
    collection.update_one.assert_not_called()
    with pytest.raises(ValueError):
        apply_import(collection, document, rows, [], tmp_path, 99)
    collection.update_one.assert_not_called()


def test_concurrent_change_refuses_write(tmp_path):
    document, normalized = sample()
    collection = MagicMock()
    collection.update_one.return_value.modified_count = 0
    with pytest.raises(RuntimeError, match="concurrently"):
        apply_import(collection, document, build_cases(document, normalized), [], tmp_path, 1)
