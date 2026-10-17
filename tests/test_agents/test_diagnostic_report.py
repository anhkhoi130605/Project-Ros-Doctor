from unittest.mock import MagicMock, patch

from src.agents.prompt.templates import build_rag_prompt
from src.models.schemas import DiagnosticReport, parse_diagnostic_report
from src.services.backend_client import BackendClient


def test_parse_diagnostic_report_from_markdown_block():
    text = """Dưới đây là kết quả phân tích sự cố:

```json
{
  "has_fault": true,
  "faults": [
    {
      "fault_type": "topic_dropout",
      "sub_type": "transient",
      "severity": "critical",
      "topic": "/ouster/imu",
      "start_sec": 20.0,
      "end_sec": 25.0,
      "evidence": "Observed rate dropped to 0 Hz for 5.00s",
      "root_cause": "QoS deadline miss or DDS participant lease expiration",
      "recommended_action": "1. Configure publisher with RELIABLE QoS",
      "citation": {
        "source_file": "guide_topic_dropout_diagnosis.md",
        "heading": "Nguyên nhân do nghẽn CPU"
      }
    }
  ],
  "summary": "Phát hiện topic dropout trên /ouster/imu từ giây 20 đến 25",
  "duration_sec": 60.0,
  "analyzed_topics": ["/ouster/imu"]
}
```

Vui lòng kiểm tra lại cấu hình QoS.
"""
    clean_text, report = parse_diagnostic_report(text)

    assert report is not None
    assert isinstance(report, DiagnosticReport)
    assert report.has_fault is True
    assert len(report.faults) == 1
    assert report.faults[0].fault_type == "topic_dropout"
    assert report.faults[0].severity == "critical"
    assert report.faults[0].citation.source_file == "guide_topic_dropout_diagnosis.md"
    assert "Dưới đây là kết quả phân tích sự cố:" in clean_text
    assert "Vui lòng kiểm tra lại cấu hình QoS." in clean_text


def test_parse_diagnostic_report_plain_text():
    text = "Đây chỉ là câu hỏi thông thường, không có JSON."
    clean_text, report = parse_diagnostic_report(text)

    assert report is None
    assert clean_text == text


def test_backend_client_id_extraction():
    client = BackendClient()

    assert client.extract_bag_id("Hãy kiểm tra giúp tôi bag-a1b2c3d4 nhé") == "bag-a1b2c3d4"
    assert client.extract_bag_id("Phân tích file rosbag2_carla_test_0") == "rosbag2_carla_test_0"
    assert client.extract_bag_id("Không có mã nào") is None

    assert client.extract_session_id("Xem phiên sess-98765432") == "sess-98765432"
    assert client.extract_session_id("Không có phiên") is None


def test_backend_client_get_bag_with_mock():
    client = BackendClient()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "bag-123", "fileName": "test.db3", "durationSec": 45}

    with patch.object(client, "_client") as mock_client_factory:
        mock_http_client = MagicMock()
        mock_http_client.__enter__.return_value = mock_http_client
        mock_http_client.get.return_value = mock_resp
        mock_client_factory.return_value = mock_http_client

        data = client.get_bag("bag-123")
        assert data is not None
        assert data["id"] == "bag-123"
        assert data["fileName"] == "test.db3"


def test_build_rag_prompt_structure():
    prompt = build_rag_prompt(
        query="Kiểm tra lỗi TF",
        context="Context from playbook",
        telemetry="Topic: /tf (50Hz)",
    )
    prompt_str = str(prompt)
    assert "topic_dropout" in prompt_str
    assert "tf_tree_inconsistency" in prompt_str
    assert "Kiểm tra lỗi TF" in prompt_str
    assert "Context from playbook" in prompt_str


def test_parse_diagnostic_report_auto_repair_truncated_json():
    # Mô phỏng JSON bị cắt cụt do giới hạn token ở kịch bản đa lỗi (Multi-fault)
    truncated_llm_output = """Kết quả phân tích chẩn đoán cho phiên:
```json
{
  "has_fault": true,
  "faults": [
    {
      "fault_type": "frequency_drop",
      "sub_type": "severe_drop",
      "severity": "major",
      "topic": "/camera/image_raw",
      "start_sec": 10.5,
      "end_sec": 30.0,
      "evidence": "Tần số giảm từ 30Hz xuống 12Hz",
      "root_cause": "EXECUTOR_STARVATION_OR_DDS_QUEUE_OVERFLOW",
      "recommended_action": "1. Upgrade to MultiThreadedExecutor"
    },
    {
      "fault_type": "timestamp_anomaly",
      "sub_type": "clock_drift",
      "severity": "critical",
      "topic": "/carla/ego_vehicle/imu",
      "start_sec": 5.0,
      "end_sec": 45.0,
      "evidence": "Trôi dạt đồng hồ tuyến tính 2 ms/s"
"""
    clean_text, report = parse_diagnostic_report(truncated_llm_output)

    assert report is not None
    assert report.has_fault is True
    assert len(report.faults) >= 1
    assert report.faults[0].fault_type == "frequency_drop"
    assert report.faults[0].topic == "/camera/image_raw"


def test_parse_diagnostic_report_auto_repair_trailing_commas_and_python_literals():
    # JSON có dấu phẩy thừa (trailing commas), hằng số True/False/None của Python và chú thích //
    syntax_error_json = """
```json
{
  // Báo cáo chẩn đoán sự cố
  "has_fault": True,
  "faults": [
    {
      "fault_type": "sensor_anomaly",
      "sub_type": "gyro_bias_drift",
      "severity": "critical",
      "topic": "/ouster/imu",
      "start_sec": 0.0,
      "end_sec": 40.0,
      "evidence": "Yaw drift rate 0.08 rad/s",
      "root_cause": "THERMAL_ZERO_RATE_BIAS_DRIFT_OR_FAULTY_BOOT_CALIBRATION",
      "citation": None,
    },
  ],
  "summary": "Phát hiện trôi yaw tích phân",
  "analyzed_topics": ["/ouster/imu",],
}
```
"""
    clean_text, report = parse_diagnostic_report(syntax_error_json)

    assert report is not None
    assert report.has_fault is True
    assert len(report.faults) == 1
    assert report.faults[0].fault_type == "sensor_anomaly"
    assert report.faults[0].sub_type == "gyro_bias_drift"


def test_parse_diagnostic_report_auto_repair_single_quotes_python_dict():
    # Mô phỏng LLM sinh ra dạng dict với dấu nháy đơn Python
    python_dict_str = """
{'has_fault': True, 'faults': [{'fault_type': 'topic_dropout', 'sub_type': 'transient', 'severity': 'critical', 'topic': '/tf', 'start_sec': 12.0, 'end_sec': 14.5, 'evidence': 'TF transform missing'}], 'summary': 'Phát hiện TF dropout'}
"""
    clean_text, report = parse_diagnostic_report(python_dict_str)

    assert report is not None
    assert report.has_fault is True
    assert len(report.faults) == 1
    assert report.faults[0].fault_type == "topic_dropout"
    assert report.faults[0].topic == "/tf"


