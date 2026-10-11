"""
Seed Master Benchmark Ground Truth Datasets into MongoDB Atlas collection 'benchmark_datasets'.
Imports:
  1. BENCHMARK-16-CURATED (16 cases from benchmark_datasets/ground_truth.json)
  2. BENCHMARK-100-SCENARIOS (100 cases from benchmark_dataset/dataset_summary.json + manifests)
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
GDRIVE_REPORT_DIR = Path(r"G:\My Drive\CTRL-SHIFT-N\Main\Report")


def load_mongo_settings() -> tuple[str, str]:
    if not APPSETTINGS_PATH.exists():
        raise FileNotFoundError(f"Cannot find appsettings.json at {APPSETTINGS_PATH}")
    with open(APPSETTINGS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    mongo_settings = data.get("MongoDbSettings", {})
    conn_str = mongo_settings.get("ConnectionString")
    db_name = mongo_settings.get("DatabaseName", "CtrlShiftN")
    if not conn_str:
        raise ValueError("Missing MongoDbSettings:ConnectionString in appsettings.json")
    return conn_str, db_name


def build_suite_16() -> dict | None:
    p = GDRIVE_REPORT_DIR / "benchmark_datasets" / "ground_truth.json"
    if not p.exists():
        print(f"[WARN] File not found: {p}")
        return None

    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_cases = []
    for case_id, case_info in data.items():
        topic = case_info.get("topic", "")
        start_sec = float(case_info.get("start_sec", 0.0))
        end_sec = float(case_info.get("end_sec", 0.0))
        label = case_info.get("fault_type", "nominal" if not case_info.get("has_fault") else "fault")
        rosbag_name = f"{case_id}.db3"

        # ground_truth payload
        gt_payload = {
            "has_fault": case_info.get("has_fault", False),
            "fault_type": case_info.get("fault_type", "none"),
            "severity": case_info.get("severity", "none"),
            "root_cause": case_info.get("root_cause", ""),
            "pattern": case_info.get("pattern", ""),
            "expected_hz": case_info.get("expected_hz"),
            "actual_hz": case_info.get("actual_hz"),
            "description": case_info.get("description", ""),
        }

        test_cases.append({
            "code": case_id,
            "rosbag_name": rosbag_name,
            "topic": topic,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "label": label,
            "ground_truth": json.dumps(gt_payload, ensure_ascii=False),
        })

    return {
        "code": "BENCHMARK-16-CURATED",
        "name": "Nav2 & Sensor Fault Diagnosis 16-Curated Benchmark",
        "provenance": "Oxford Newer College Dataset (16 Curated Fault Patterns)",
        "total_cases": len(test_cases),
        "test_cases": test_cases,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


def build_suite_100() -> dict | None:
    summary_path = GDRIVE_REPORT_DIR / "benchmark_dataset" / "dataset_summary.json"
    if not summary_path.exists():
        print(f"[WARN] File not found: {summary_path}")
        return None

    with open(summary_path, "r", encoding="utf-8") as f:
        summary_data = json.load(f)

    scenarios = summary_data.get("scenarios", [])
    scenarios_dir = GDRIVE_REPORT_DIR / "benchmark_dataset" / "scenarios"

    test_cases = []
    for sc in scenarios:
        sc_id = sc.get("scenario_id")
        bag_dir = sc.get("bag_dir", f"scenarios/{sc_id}")
        rosbag_name = f"{sc_id}_0.db3"
        topic = sc.get("affected_topic") or ""
        label = sc.get("fault_type", "none")

        # Try to load scenario manifest if present
        manifest_file = scenarios_dir / sc_id / "manifest.json"
        gt_window = [0.0, 0.0]
        root_cause = ""
        category = sc.get("group", "")
        extra_manifest = {}

        if manifest_file.exists():
            try:
                with open(manifest_file, "r", encoding="utf-8") as mf:
                    mdata = json.load(mf)
                    gt_window = mdata.get("ground_truth_window_sec") or [0.0, 0.0]
                    category = mdata.get("category", category)
                    extra_manifest = mdata
            except Exception:
                pass

        if not gt_window or len(gt_window) < 2:
            gt_window = [0.0, 0.0]

        start_sec = float(gt_window[0])
        end_sec = float(gt_window[1])

        gt_payload = {
            "scenario_index": sc.get("index"),
            "group": sc.get("group"),
            "category": category,
            "is_faulty": sc.get("is_faulty", False),
            "fault_type": sc.get("fault_type", "none"),
            "severity": sc.get("severity", "none"),
            "affected_topic": topic,
            "description": sc.get("description", ""),
            "ground_truth_window_sec": [start_sec, end_sec],
            "parameters": extra_manifest.get("parameters", {}),
            "telemetry_stats": extra_manifest.get("telemetry_stats", {}),
        }

        test_cases.append({
            "code": sc_id,
            "rosbag_name": rosbag_name,
            "topic": topic,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "label": label,
            "ground_truth": json.dumps(gt_payload, ensure_ascii=False),
        })

    return {
        "code": "BENCHMARK-100-SCENARIOS",
        "name": summary_data.get("dataset_name", "Nav2 & Sensor Fault Diagnosis 100-Benchmark"),
        "provenance": summary_data.get("provenance", "Oxford Newer College Dataset"),
        "total_cases": len(test_cases),
        "group_distribution": summary_data.get("group_distribution", {}),
        "fault_type_distribution": summary_data.get("fault_type_distribution", {}),
        "test_cases": test_cases,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


def main():
    print("=" * 60)
    print("Seeding Benchmark Datasets to MongoDB Atlas...")
    print("=" * 60)

    conn_str, db_name = load_mongo_settings()
    print(f"Connecting to MongoDB Atlas [{db_name}]...")
    client = MongoClient(conn_str, serverSelectionTimeoutMS=10000)
    db = client[db_name]

    # Test connection
    client.admin.command("ping")
    print("Successfully connected to MongoDB Atlas!")

    col = db["benchmark_datasets"]

    # 1. Suite 16
    print("\nPreparing BENCHMARK-16-CURATED...")
    suite_16 = build_suite_16()
    if suite_16:
        result = col.update_one(
            {"code": suite_16["code"]},
            {"$setOnInsert": {**suite_16, "is_published": True, "version": 1,
                              "updated_at": suite_16["created_at"], "change_request": None}},
            upsert=True,
        )
        status = "Kept existing (use review workflow to update)" if result.matched_count > 0 else "Inserted"
        print(f"[{status}] BENCHMARK-16-CURATED with {suite_16['total_cases']} test cases.")

    # 2. Suite 100
    print("\nPreparing BENCHMARK-100-SCENARIOS...")
    suite_100 = build_suite_100()
    if suite_100:
        result = col.update_one(
            {"code": suite_100["code"]},
            {"$setOnInsert": {**suite_100, "is_published": True, "version": 1,
                              "updated_at": suite_100["created_at"], "change_request": None}},
            upsert=True,
        )
        status = "Kept existing (use review workflow to update)" if result.matched_count > 0 else "Inserted"
        print(f"[{status}] BENCHMARK-100-SCENARIOS with {suite_100['total_cases']} test cases.")

    # Verify counts
    total_docs = col.count_documents({})
    print("\n" + "=" * 60)
    print(f"Verification: Total benchmark documents in 'benchmark_datasets': {total_docs}")
    for doc in col.find({}, {"code": 1, "name": 1, "total_cases": 1}):
        print(f" - Code: {doc.get('code')} | Name: {doc.get('name')} | Cases: {doc.get('total_cases')}")
    print("=" * 60)
    print("Import completed successfully!")


if __name__ == "__main__":
    main()
