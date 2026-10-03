import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import json
import os
import ssl
import sys
import time
import urllib.request

ctx = ssl._create_unverified_context()

BASE_DIR = os.path.abspath("src/1_fault_type_scenarios")
GT_PATH = os.path.join(BASE_DIR, "ground_truth.json")

with open(GT_PATH, "r", encoding="utf-8") as f:
    ground_truth = json.load(f)

test_scenarios = [
    {
        "domain": "1. Topic Dropout",
        "key": "1_topic_dropout/scen_01_imu_transient_2s",
        "file": os.path.join(BASE_DIR, "1_topic_dropout", "scen_01_imu_transient_2s", "scen_01_imu_transient_2s.db3"),
    },
    {
        "domain": "2. Frequency Drop",
        "key": "2_frequency_drop/scen_04_severe_drop_60pct",
        "file": os.path.join(BASE_DIR, "2_frequency_drop", "scen_04_severe_drop_60pct", "scen_04_severe_drop_60pct.db3"),
    },
    {
        "domain": "3. Timestamp Anomaly",
        "key": "3_timestamp_anomaly/scen_05_linear_drift_slow_2ms_per_s",
        "file": os.path.join(BASE_DIR, "3_timestamp_anomaly", "scen_05_linear_drift_slow_2ms_per_s", "scen_05_linear_drift_slow_2ms_per_s.db3"),
    },
    {
        "domain": "4. TF Tree Defects",
        "key": "4_tf_tree_defects/scen_01_frame_jump_2m",
        "file": os.path.join(BASE_DIR, "4_tf_tree_defects", "scen_01_frame_jump_2m", "scen_01_frame_jump_2m.db3"),
    },
    {
        "domain": "5. Node Crash & Outliers",
        "key": "5_node_crash_and_outliers/scen_03_accel_spike_isolated_40g",
        "file": os.path.join(BASE_DIR, "5_node_crash_and_outliers", "scen_03_accel_spike_isolated_40g", "scen_03_accel_spike_isolated_40g.db3"),
    },
]

print("=" * 80)
print("BENCHMARK TEST: 5 NHÓM LỖI - 1 KỊCH BẢN / NHÓM")
print("=" * 80)

results = []

for idx, item in enumerate(test_scenarios, 1):
    domain = item["domain"]
    key = item["key"]
    db_file = item["file"].replace("\\", "/")
    gt = ground_truth.get(key, {})
    expected_fault = gt.get("fault_type", "unknown")
    expected_topic = gt.get("topic", "N/A")
    expected_rca = gt.get("root_cause", "N/A")

    print(f"\n[{idx}/5] Đang kiểm tra: {domain} ({key})")
    print(f"  Ground Truth: Fault={expected_fault} | Topic={expected_topic} | RCA={expected_rca}")

    # 1. Gọi .NET Backend Inspect API
    t0 = time.time()
    inspect_url = "https://localhost:7149/api/bags/inspect"
    payload = {"bagPath": db_file}
    req = urllib.request.Request(
        inspect_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            inspect_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [Error] Gọi API Inspect thất bại: {e}")
        inspect_data = {"anomalies": []}

    inspect_time = round(time.time() - t0, 2)
    anomalies = inspect_data.get("anomalies", [])
    print(f"  Backend Inspection ({inspect_time}s): Phát hiện {len(anomalies)} bất thường đo đạc")
    for a in anomalies[:3]:
        print(f"    - [{a.get('severity')}] {a.get('anomalyType')} trên {a.get('topic')}: {a.get('issueTitle')} ({a.get('timeRange')})")

    # 2. Xây dựng prompt và gọi AI Agent (LangGraph + RAG RCA)
    fault_text = "\n".join([
        f"{i+1}. [{a.get('severity')}] Topic '{a.get('topic')}': {a.get('issueTitle')} ({a.get('timeRange')})"
        for i, a in enumerate(anomalies[:5])
    ]) if anomalies else "Không có bất thường đo đạc."

    agent_prompt = f"""Yêu cầu thực hiện chẩn đoán chuyên sâu Root Cause Analysis (RCA) cho phiên phân tích Rosbag:
- Mã phiên: test-{idx}
- Tiêu đề phiên: {key}
- Thời lượng: {inspect_data.get('durationSec', 85)}s

CÁC BẤT THƯỜNG TELEMETRY ĐÃ PHÁT HIỆN:
{fault_text}

YÊU CẦU: Xác định chính xác lỗi cốt lõi, nguyên nhân gốc rễ (RCA) chuẩn vật lý và hành động khắc phục chuẩn ROS 2."""

    agent_url = "http://127.0.0.1:8000/api/v1/chat"
    req_agent = urllib.request.Request(
        agent_url,
        data=json.dumps({"message": agent_prompt}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    t_agent_0 = time.time()
    agent_output = {}
    try:
        with urllib.request.urlopen(req_agent, timeout=30) as resp:
            agent_output = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [Error] Gọi AI Agent thất bại: {e}")

    agent_time = round(time.time() - t_agent_0, 2)
    report = agent_output.get("report") or {}
    primary_fault = report.get("faults", [{}])[0] if report.get("faults") else {}

    detected_type = primary_fault.get("fault_type", "none")
    detected_sub_type = primary_fault.get("sub_type", "")
    detected_topic = primary_fault.get("topic", "")
    detected_rca = primary_fault.get("root_cause", "")
    action = primary_fault.get("recommended_action", "")

    print(f"  AI Agent Diagnosis ({agent_time}s):")
    print(f"    - Detected Fault: {detected_type} ({detected_sub_type}) trên {detected_topic}")
    print(f"    - Diagnosed RCA:  {detected_rca}")
    print(f"    - First Action:   {action.splitlines()[0] if action else 'N/A'}")

    results.append({
        "domain": domain,
        "scenario": key,
        "gt_fault": expected_fault,
        "gt_topic": expected_topic,
        "gt_rca": expected_rca,
        "backend_findings_count": len(anomalies),
        "backend_top_finding": anomalies[0].get("anomalyType") if anomalies else "None",
        "agent_fault": detected_type,
        "agent_sub_type": detected_sub_type,
        "agent_topic": detected_topic,
        "agent_rca": detected_rca,
        "agent_action": action,
        "inspect_time": inspect_time,
        "agent_time": agent_time,
    })

print("\n" + "=" * 80)
print("TỔNG HỢP KẾT QUẢ TEST 5 MIỀN LỖI")
print("=" * 80)
for r in results:
    print(f"\n{r['domain']}: {r['scenario']}")
    print(f"  Backend Top Finding: {r['backend_top_finding']} ({r['backend_findings_count']} findings, {r['inspect_time']}s)")
    print(f"  Agent Diagnosed:     {r['agent_fault']} / {r['agent_sub_type']} on {r['agent_topic']} ({r['agent_time']}s)")
    print(f"  Agent RCA:           {r['agent_rca']}")
    print(f"  GT Expected Fault:   {r['gt_fault']} on {r['gt_topic']}")
    print(f"  GT Expected RCA:     {r['gt_rca']}")
