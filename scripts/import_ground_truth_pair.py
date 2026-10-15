"""Explicit maintenance import into ONE existing published dataset; dry-run by default.

No new collection, no upsert, no replacement of legacy fields or review requests.
Run as a module from the project root: python -m scripts.import_ground_truth_pair ...
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import subprocess
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from bson import json_util
from pymongo import MongoClient

from src.config import get_settings


def build_cases(document: dict, normalized: list[dict]) -> list[dict]:
    if document.get("is_published", True) is not True:
        raise ValueError("Dataset is not published; use the normal review workflow.")
    if (document.get("change_request") or {}).get("status") == "Pending":
        raise ValueError("A review is pending; refusing to modify its base version.")
    rows = copy.deepcopy(document.get("test_cases", []))
    incoming = {item["caseId"]: item["groundTruthDetail"] for item in normalized}
    identities = [row.get("case_id") or row.get("code") for row in rows]
    if len(incoming) != len(normalized) or len(set(identities)) != len(rows) or set(identities) != set(incoming):
        raise ValueError("Existing case IDs must match the imported set exactly; no rows will be added or removed.")
    for row, case_id in zip(rows, identities, strict=True):
        row["case_id"] = case_id
        row["ground_truth_detail"] = incoming[case_id]
    return rows


def apply_import(collection, document, rows, source_files, backup_directory: Path, expected_version: int):
    # Repeat safety checks at the write boundary and use compare-and-set below.
    build_cases(document, [{"caseId": row["case_id"], "groundTruthDetail": row["ground_truth_detail"]} for row in rows])
    if rows == document.get("test_cases"):
        return {"status": "unchanged", "version": document.get("version", 1)}
    version = document.get("version", 1)
    if version != expected_version:
        raise ValueError("Version differs from --expected-version; rerun dry-run and inspect changes.")
    backup_directory.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", prefix="benchmark-before-",
                                     dir=backup_directory, delete=False) as backup:
        backup.write(json_util.dumps(document, ensure_ascii=False, indent=2))
        backup_path = backup.name
    now = datetime.now(UTC)
    selector = {"_id": document["_id"], "code": document["code"], "test_cases": document["test_cases"],
                "version": document["version"] if "version" in document else {"$exists": False},
                "is_published": document["is_published"] if "is_published" in document else {"$exists": False},
                "change_request": document.get("change_request")}
    result = collection.update_one(selector, {"$set": {
        "test_cases": rows, "version": version + 1, "updated_at": now,
        "ground_truth_import": {"method": "explicit_maintenance_import", "at": now,
                                "previous_version": version, "source_files": source_files},
    }}, upsert=False)
    if result.modified_count != 1:
        raise RuntimeError("Dataset changed concurrently; nothing overwritten. Backup: " + backup_path)
    return {"status": "updated", "version": version + 1, "cases": len(rows), "backup": backup_path}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vi", type=Path, required=True)
    parser.add_argument("--en", type=Path, required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-version", type=int)
    parser.add_argument("--backup-dir", type=Path, default=Path("tmp/ground-truth-backups"))
    args = parser.parse_args()
    if args.apply and args.expected_version is None:
        parser.error("--apply requires --expected-version from a prior dry-run")
    script = Path(__file__).with_name("normalize_ground_truth_pair.mjs")
    # Read-only normalization; no credentials or database documents passed to Node.
    result = subprocess.run(["node", str(script), str(args.vi.resolve()), str(args.en.resolve())],
                            capture_output=True, encoding="utf-8", check=True)
    normalized = json.loads(result.stdout)
    settings = get_settings()
    if not settings.mongo_connection_string:
        raise ValueError("MongoDB is not configured")
    with MongoClient(settings.mongo_connection_string, serverSelectionTimeoutMS=10000, socketTimeoutMS=15000) as client:
        collection = client[settings.mongo_database_name]["benchmark_datasets"]
        matches = list(collection.find({"code": args.dataset}).limit(2))
        if len(matches) != 1:
            raise ValueError("Expected exactly one existing dataset with this code")
        document = matches[0]
        rows = build_cases(document, normalized)
        sources = [{"name": path.name, "language": lang, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                   for lang, path in [("vi", args.vi), ("en", args.en)]]
        print(json.dumps({"dataset": args.dataset, "database": settings.mongo_database_name,
                          "current_version": document.get("version", 1), "cases": len(rows),
                          "changed": rows != document.get("test_cases"), "apply": args.apply}, ensure_ascii=True))
        if args.apply:
            print(json.dumps(apply_import(collection, document, rows, sources, args.backup_dir, args.expected_version), ensure_ascii=True))


if __name__ == "__main__":
    main()
