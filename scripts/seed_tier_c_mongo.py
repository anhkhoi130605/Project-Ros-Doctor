"""
Seed Tier C Benchmark Suite (110 cases) into MongoDB Atlas collection 'benchmark_datasets'.
Dataset Code: BENCHMARK-TIER-C-110
"""

from __future__ import annotations

import datetime
import json
import sys
from pathlib import Path

from pymongo import MongoClient

# Configure stdout encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APPSETTINGS_PATH = PROJECT_ROOT / "WebAPI" / "BackEnd(ASP.Net)" / "API" / "appsettings.json"
SUMMARY_PATH = PROJECT_ROOT / "data" / "tier_c_benchmark" / "dataset_summary.json"


def load_mongo_settings() -> tuple[str, str]:
    if not APPSETTINGS_PATH.exists():
        raise FileNotFoundError(f"Cannot find appsettings.json at {APPSETTINGS_PATH}")
    with open(APPSETTINGS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    mongo_settings = data.get("MongoDbSettings", {})
    conn_str = mongo_settings.get("ConnectionString")
    db_name = mongo_settings.get("DatabaseName", "CtrlShiftN")
    if not conn_str:
        raise ValueError("Missing MongoDbSettings:ConnectionString in appsettings.json")
    return conn_str, db_name


def main():
    print("=" * 80)
    print("Seeding BENCHMARK-TIER-C-110 into MongoDB Atlas 'benchmark_datasets'...")
    print("=" * 80)

    if not SUMMARY_PATH.exists():
        raise FileNotFoundError(f"Missing {SUMMARY_PATH}. Run scripts/generate_tier_c_benchmark.py first.")

    with open(SUMMARY_PATH, encoding="utf-8") as f:
        summary_data = json.load(f)

    conn_str, db_name = load_mongo_settings()
    print(f"Connecting to MongoDB Atlas [{db_name}]...")
    client = MongoClient(conn_str, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    client.admin.command("ping")
    print("Successfully connected to MongoDB Atlas!")

    col = db["benchmark_datasets"]

    dataset_doc = {
        "code": summary_data["code"],
        "name": summary_data["name"],
        "provenance": summary_data["provenance"],
        "total_cases": summary_data["total_cases"],
        "is_published": True,
        "version": 1,
        "created_at": datetime.datetime.now(datetime.UTC),
        "updated_at": datetime.datetime.now(datetime.UTC),
        "change_request": None,
        "test_cases": summary_data["test_cases"],
    }

    result = col.update_one(
        {"code": summary_data["code"]},
        {"$set": dataset_doc},
        upsert=True,
    )

    action = "Updated" if result.matched_count > 0 else "Inserted"
    print(f"[{action}] Dataset '{summary_data['code']}' with {summary_data['total_cases']} test cases.")
    print("=" * 80)


if __name__ == "__main__":
    main()
