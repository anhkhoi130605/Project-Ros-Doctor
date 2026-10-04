"""
Seed Golden Benchmark Suite into MongoDB collection 'benchmark_datasets'.

Datasets to seed:
1. BENCHMARK-25-GOLDEN (25 curated master cases from golden_dataset/ground_truth.json)
2. BENCHMARK-50-FAULT-TYPES (50 systematic fault-type scenarios from scenarios/1_fault_type_scenarios/ground_truth.json)
3. BENCHMARK-250-CASE-SUITE (250 multi-scenario variations from scenarios/2_case_benchmark_scenarios/ground_truth.json)
"""

from __future__ import annotations

import datetime
import json
import re
import sys
from pathlib import Path
from pymongo import MongoClient

# Configure stdout encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(r"d:\Project-VinUni\P-137")
APPSETTINGS_PATH = PROJECT_ROOT / "WebAPI" / "BackEnd(ASP.Net)" / "API" / "appsettings.json"
GOLDEN_SUITE_DIR = Path(r"G:\My Drive\CTRL-SHIFT-N\Main\Report\golden_benchmark_suite")


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


def build_suite_25_golden() -> dict | None:
    gt_path = GOLDEN_SUITE_DIR / "golden_dataset" / "ground_truth.json"
    if not gt_path.exists():
        print(f"[WARN] Not found: {gt_path}")
        return None

    with open(gt_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_cases = []
    for case_id, info in data.items():
        topic = info.get("topic") or ""
        start_sec = float(info.get("start_sec") or 0.0)
        end_sec = float(info.get("end_sec") or 0.0)
        label = info.get("fault_type", "nominal" if not info.get("has_fault") else "fault")
        rosbag_name = f"{case_id}.db3"

        test_cases.append({
            "code": case_id,
            "rosbag_name": rosbag_name,
            "topic": topic if isinstance(topic, str) else ", ".join(topic),
            "start_sec": start_sec,
            "end_sec": end_sec,
            "label": label,
            "ground_truth": json.dumps(info, ensure_ascii=False),
        })

    return {
        "code": "BENCHMARK-25-GOLDEN",
        "name": "Autonomous Robot & Sensor Fault Diagnosis Golden 25 Benchmark",
        "provenance": "ETH Zurich Lake Katzensee / Oxford Newer College Master Golden Benchmark Suite",
        "total_cases": len(test_cases),
        "test_cases": test_cases,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


def build_suite_50_fault_types() -> dict | None:
    gt_path = GOLDEN_SUITE_DIR / "scenarios" / "1_fault_type_scenarios" / "ground_truth.json"
    if not gt_path.exists():
        print(f"[WARN] Not found: {gt_path}")
        return None

    with open(gt_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_cases = []
    for sc_key, info in data.items():
        # sc_key e.g. "1_topic_dropout/scen_01_imu_transient_2s"
        topic = info.get("topic") or ""
        if isinstance(topic, list):
            topic = ", ".join(topic)

        # parse duration from scenario name or info if available
        # e.g. scen_01_imu_transient_2s
        start_sec = 0.0
        end_sec = 0.0
        m = re.search(r"(\d+)s", sc_key)
        if m:
            dur = float(m.group(1))
            start_sec = 10.0
            end_sec = 10.0 + dur

        label = info.get("fault_type", "nominal" if not info.get("has_fault") else "fault")
        clean_code = sc_key.replace("/", "_")
        rosbag_name = f"{sc_key.split('/')[-1]}.db3"

        test_cases.append({
            "code": sc_key,
            "rosbag_name": rosbag_name,
            "topic": topic,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "label": label,
            "ground_truth": json.dumps(info, ensure_ascii=False),
        })

    return {
        "code": "BENCHMARK-50-FAULT-TYPES",
        "name": "ROS2 Systematic Fault Types 50-Scenario Benchmark",
        "provenance": "IEEE ROS-RVFT 2024 / Fault Injection Scenarios",
        "total_cases": len(test_cases),
        "test_cases": test_cases,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


def build_suite_250_case_suite() -> dict | None:
    gt_path = GOLDEN_SUITE_DIR / "scenarios" / "2_case_benchmark_scenarios" / "ground_truth.json"
    if not gt_path.exists():
        print(f"[WARN] Not found: {gt_path}")
        return None

    with open(gt_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_cases = []
    for sc_key, info in data.items():
        # sc_key e.g. "case_01_nominal_clean/scen_01"
        parts = sc_key.split("/")
        case_origin = info.get("case_origin", parts[0] if parts else "")
        scen_id = info.get("scenario_id", parts[1] if len(parts) > 1 else "")

        label = info.get("fault_type", "nominal" if not info.get("has_fault") else "fault")
        rosbag_name = f"{scen_id}.db3"

        desc = info.get("description", "")
        # parse possible window from description e.g. "starting at 17.0s for duration 2.0s"
        start_sec = 0.0
        end_sec = 0.0
        m = re.search(r"starting at ([\d\.]+)s for duration ([\d\.]+)s", desc)
        if m:
            start_sec = float(m.group(1))
            end_sec = start_sec + float(m.group(2))

        test_cases.append({
            "code": sc_key,
            "rosbag_name": rosbag_name,
            "topic": info.get("topic", ""),
            "start_sec": start_sec,
            "end_sec": end_sec,
            "label": label,
            "ground_truth": json.dumps(info, ensure_ascii=False),
        })

    return {
        "code": "BENCHMARK-250-CASE-SUITE",
        "name": "ROS2 Scaled Multi-Scenario 250-Benchmark Suite",
        "provenance": "ETH Lake Katzensee Survey / Multi-Variation Stress Benchmark",
        "total_cases": len(test_cases),
        "test_cases": test_cases,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


def main():
    print("=" * 60)
    print("Seeding Golden Benchmark Suite into MongoDB Atlas...")
    print("=" * 60)

    conn_str, db_name = load_mongo_settings()
    print(f"Connecting to MongoDB Atlas [{db_name}]...")
    client = MongoClient(conn_str, serverSelectionTimeoutMS=10000)
    db = client[db_name]

    client.admin.command("ping")
    print("Successfully connected to MongoDB Atlas!")

    col = db["benchmark_datasets"]

    suites = [
        ("BENCHMARK-25-GOLDEN", build_suite_25_golden),
        ("BENCHMARK-50-FAULT-TYPES", build_suite_50_fault_types),
        ("BENCHMARK-250-CASE-SUITE", build_suite_250_case_suite),
    ]

    for code, builder in suites:
        print(f"\nBuilding dataset {code}...")
        suite = builder()
        if suite:
            result = col.replace_one(
                {"code": suite["code"]},
                suite,
                upsert=True,
            )
            status = "Updated" if result.matched_count > 0 else "Inserted"
            print(f"[{status}] {suite['code']} with {suite['total_cases']} test cases.")

    print("\n" + "=" * 60)
    print("Current Datasets in 'benchmark_datasets' collection:")
    for doc in col.find({}, {"code": 1, "name": 1, "total_cases": 1, "created_at": 1}):
        print(f" - [{doc.get('code')}] {doc.get('name')} ({doc.get('total_cases')} cases)")
    print("=" * 60)


if __name__ == "__main__":
    main()
