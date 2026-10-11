from src.services.benchmark_publication import official_benchmark


def test_legacy_benchmark_remains_published():
    assert official_benchmark({"code": "OLD", "test_cases": []}) == {"code": "OLD", "test_cases": []}


def test_unpublished_benchmark_is_not_evidence():
    for status in ("Pending", "Rejected", "Cancelled"):
        assert official_benchmark({"code": "NEW", "is_published": False,
                                   "change_request": {"status": status}}) is None


def test_pending_update_never_enters_rag_or_changes_revision_payload():
    official = {"code": "OLD", "name": "Approved", "test_cases": [], "version": 1}
    pending = {**official, "is_published": True, "updated_at": "today",
               "change_request": {"status": "Pending", "proposed_data": {"name": "UNAPPROVED"}}}
    assert official_benchmark(pending) == official
    assert "change_request" in pending  # no mutation of source


def test_invalid_publication_value_fails_closed():
    assert official_benchmark({"is_published": "false"}) is None
    assert official_benchmark(None) is None


if __name__ == "__main__":
    checks = [value for name, value in list(globals().items()) if name.startswith("test_")]
    for check in checks:
        check()
    print(f"{len(checks)} publication checks passed; no database used.")
