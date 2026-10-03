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
