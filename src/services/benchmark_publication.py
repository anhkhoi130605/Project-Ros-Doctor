"""Publication boundary shared by benchmark readers and RAG ingestion.

Legacy records are published; a pending update never replaces official fields.
Review payloads and reviewer metadata must never become retrieval evidence.
"""

PUBLISHED_FILTER = {"$or": [{"is_published": True}, {"is_published": {"$exists": False}}]}
OFFICIAL_FIELDS = (
    "_id", "code", "name", "provenance", "total_cases", "test_cases",
    "group_distribution", "fault_type_distribution", "created_at", "version",
)


def official_benchmark(document):
    if not isinstance(document, dict) or document.get("is_published", True) is not True:
        return None
    return {key: document[key] for key in OFFICIAL_FIELDS if key in document}
