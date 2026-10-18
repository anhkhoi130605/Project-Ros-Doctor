import copy
import json
from unittest.mock import MagicMock

import pytest

from src.services.ground_truth_lookup import (
    GroundTruthAmbiguousError,
    GroundTruthInvalidError,
    GroundTruthNotFoundError,
    detect_lookup,
    lookup_case,
    lookup_for_query,
)

CASE = "case_11_outlier_accel_spike"
CODE = "BENCHMARK-25-GOLDEN"


@pytest.fixture
def dataset():
    return {"_id": "document-id", "code": CODE, "version": 2, "is_published": True,
            "test_cases": [{"code": CASE, "case_id": CASE, "ground_truth": "Legacy",
                            "ground_truth_detail": {"schema_version": 1, "has_fault": True,
                "fault_type": "value_outlier", "severity": "major", "topic": "/ouster/imu",
                "root_cause": "MECHANICAL_COLLISION_OR_SENSOR_GLITCH",
                "observed_symptom": {"peak_value": 99.9, "spike_timestamps": [25.0, 25.05, 40.0]},
                "i18n": {
                    "vi": {"required_evidence": ["Gia tốc vượt 50 m/s^2"], "remediation_playbook": ["Kiểm tra cảm biến"],
                           "injected_mechanism": "Tiêm lỗi", "plausible_root_causes": [{"category": "GLITCH", "rationale": "Giả thuyết"}],
                           "academic_reference": {"url": "https://example.invalid/paper", "paper": "Nguồn tham khảo"}},
                    "en": {"required_evidence": ["Acceleration exceeds 50 m/s^2"], "remediation_playbook": ["Check sensor"],
                           "injected_mechanism": "Fault injection", "plausible_root_causes": [],
                           "academic_reference": {"url": "https://example.invalid/paper", "paper": "Source"}}
                }}}], "change_request": {"status": "Pending", "proposed_data": {"secret": "UNAPPROVED_ANSWER"}}}


def collection_for(*documents):
    collection = MagicMock()
    collection.find.return_value.limit.return_value = documents
    return collection


@pytest.mark.parametrize("query,language,expected_case", [
    (f"Tra cứu ground truth tiếng Việt của {CASE}", "vi", CASE),
    (f"Show ground truth for {CASE} in English", "en", CASE),
    (f"Hiển thị đáp án chuẩn {CASE}", "vi", CASE),
    (f"Tra cứu ground_truth {CASE} tiếng Anh", "en", CASE),
    ("Show ground truth for tier_c_001_av_autoware_robotaxi_scen_00_nominal_clean in English", "en", "tier_c_001_av_autoware_robotaxi_scen_00_nominal_clean"),
    ("Tra cứu ground truth của tier_c_002_av_autoware_robotaxi_scen_01_transient_imu_dropout tiếng Việt", "vi", "tier_c_002_av_autoware_robotaxi_scen_01_transient_imu_dropout"),
])
def test_explicit_lookup_intent(query, language, expected_case):
    intent = detect_lookup(query)
    assert intent.case_id == expected_case
    assert intent.language == language


@pytest.mark.parametrize("query", [
    f"Phân tích {CASE}", "Ground truth là gì?",
    f"Chẩn đoán {CASE} không dùng ground truth", f"Analyze {CASE} without ground truth",
])
def test_diagnostics_do_not_lookup_answers(query):
    assert detect_lookup(query) is None


@pytest.mark.parametrize("query,language", [
    ("Bằng chứng của lỗi này là gì?", "vi"),
    ("Cho tôi xem bằng chứng cần kiểm tra", "vi"),
    ("Lỗi này có nguồn trích dẫn nào?", "vi"),
    ("What evidence should I check for this fault?", "en"),
    ("Show evidence for this session in Vietnamese", "vi"),
    ("Bằng chứng (evidence) của lỗi này là gì?", "vi"),
    ("Bằng chứng của lỗi này, trả lời tiếng Anh", "en"),
])
def test_natural_evidence_intent(query, language):
    intent = detect_lookup(query)
    assert intent is not None and intent.language == language


@pytest.mark.parametrize("query", [
    "Bằng chứng là gì?", "What is evidence?", "Phân tích lỗi của phiên này",
    "Cho xem bằng chứng thực tế của phiên này", "Show measured evidence for this session",
    "Xem bằng chứng không dùng ground truth", "Cho xem telemetry và bằng chứng",
    "Cho xem bằng chứng từ log", "Show evidence from logs for this session",
])
def test_measurement_and_general_questions_keep_diagnostic_flow(query):
    assert detect_lookup(query) is None


@pytest.fixture
def lookup_services(dataset, monkeypatch):
    from src.services import backend_client, benchmark_dataset_service
    backend = MagicMock()
    backend.get_session.return_value = {"bagId": "selected-bag"}
    backend.get_bag.return_value = {"name": CASE + ".db3"}
    service = benchmark_dataset_service.BenchmarkDatasetService(MagicMock(), collection_for(dataset))
    monkeypatch.setattr(backend_client, "get_backend_client", lambda: backend)
    monkeypatch.setattr(benchmark_dataset_service, "get_benchmark_dataset_service", lambda: service)
    return backend


@pytest.mark.parametrize("context", [{"bag_id": "selected-bag"}, {"session_id": "selected-session"},
                                    {"session_id": "selected-session", "bag_id": "selected-bag"}])
def test_selected_context_resolves_evidence_without_case_code(lookup_services, context):
    result = lookup_for_query("Bằng chứng của lỗi này là gì?", **context)
    assert CASE in result["lookup_response"]
    assert result["metadata"]["source_count"] == 1
    lookup_services.get_bag.assert_called_once_with("selected-bag")
    lookup_services.get_latest_session_and_bag.assert_not_called()


@pytest.mark.parametrize("name", ["unrelated.db3", "renamed_" + CASE + ".db3", None])
def test_unknown_filename_does_not_guess_case(lookup_services, name):
    lookup_services.get_bag.return_value = {"name": name}
    result = lookup_for_query("Cho xem bằng chứng", bag_id="selected-bag")
    assert result["metadata"]["source_count"] == 0
    assert "case_id" in result["lookup_response"]
    lookup_services.get_latest_session_and_bag.assert_not_called()


def test_missing_or_mismatched_context_requests_clarification(lookup_services):
    for context in ({}, {"session_id": "session", "bag_id": "different-bag"}):
        result = lookup_for_query("Cho xem bằng chứng", **context)
        assert result["metadata"]["source_count"] == 0
    lookup_services.get_bag.assert_not_called()


def test_unavailable_backend_does_not_guess_or_expose_errors(lookup_services):
    lookup_services.get_session.return_value = None
    result = lookup_for_query("Cho xem bằng chứng", session_id="missing")
    assert result["metadata"]["source_count"] == 0
    lookup_services.get_bag.assert_not_called()
    lookup_services.get_bag.side_effect = RuntimeError("secret-connection")
    result = lookup_for_query("Cho xem bằng chứng", bag_id="selected-bag")
    assert result["metadata"]["source_count"] == 0
    assert "secret-connection" not in result["lookup_response"]


def test_explicit_case_overrides_context_but_ambiguous_cases_do_not(lookup_services):
    result = lookup_for_query(f"Bằng chứng của {CASE}?", bag_id="different-bag")
    assert result["metadata"]["source_count"] == 1
    result = lookup_for_query(f"Bằng chứng của {CASE} case_07_ts_constant_offset?", bag_id="selected-bag")
    assert result["metadata"]["source_count"] == 0
    result = lookup_for_query("Bằng chứng trong BENCHMARK-25-GOLDEN và BENCHMARK-16-CURATED?", bag_id="selected-bag")
    assert result["metadata"]["source_count"] == 0
    lookup_services.get_bag.assert_not_called()
    lookup_services.get_session.assert_not_called()


def test_multiple_cases_require_clarification():
    assert detect_lookup(f"Tra cứu ground truth {CASE} case_07_ts_constant_offset").case_id is None


def test_exact_published_lookup_with_version_and_source(dataset):
    collection = collection_for(dataset)
    before = copy.deepcopy(dataset)
    result = lookup_case(collection, CASE, CODE, "vi")
    assert result["dataset_version"] == 2
    assert result["source"]["source_document_id"] == "document-id"
    assert len(result["source"]["content_sha256"]) == 64
    for text in [CASE, CODE, "99.9", "25.05", "value_outlier", "50 m/s^2", "chưa xác nhận", "chưa xác minh độc lập"]:
        assert text in result["response"]
    assert len(result["response"]) < 800
    assert "{" not in result["response"]
    assert "Tiêm lỗi" not in result["response"]
    assert result["ground_truth_detail"]["i18n"]["vi"]["injected_mechanism"] == "Tiêm lỗi"
    assert "UNAPPROVED_ANSWER" not in json.dumps(result)
    assert dataset == before
    query, projection = collection.find.call_args.args
    assert query["code"] == CODE
    assert query["$or"] == [{"is_published": True}, {"is_published": {"$exists": False}}]
    assert "change_request" not in projection


def test_language_selection_and_localized_symptom_merge(dataset):
    detail = dataset["test_cases"][0]["ground_truth_detail"]
    detail["i18n"]["vi"]["observed_symptom"] = {"phenomenon": "Xung gia tốc"}
    result = lookup_case(collection_for(dataset), CASE, language="vi")
    assert "Xung gia tốc" in result["response"] and "99.9" in result["response"]
    english = lookup_case(collection_for(dataset), CASE, language="en")
    assert "Acceleration exceeds" in english["response"]
    assert "Gia tốc vượt" not in english["response"]


def test_no_arbitrary_dataset_selection_or_proposal_fallback(dataset):
    with pytest.raises(GroundTruthAmbiguousError):
        lookup_case(collection_for(dataset, {**dataset, "code": "OTHER"}), CASE)
    with pytest.raises(GroundTruthNotFoundError):
        lookup_case(collection_for({**dataset, "is_published": False}), CASE)
    with pytest.raises(GroundTruthNotFoundError):
        lookup_case(collection_for({**dataset, "test_cases": []}), CASE)
    with pytest.raises(GroundTruthNotFoundError):
        lookup_case(collection_for(), CASE)


def test_missing_language_and_bad_identifier_do_not_get_fabricated(dataset):
    del dataset["test_cases"][0]["ground_truth_detail"]["i18n"]["en"]
    with pytest.raises(GroundTruthInvalidError):
        lookup_case(collection_for(dataset), CASE, language="en")
    with pytest.raises(GroundTruthInvalidError):
        lookup_case(collection_for(dataset), "$where")


@pytest.mark.asyncio
async def test_chat_lookup_does_not_call_telemetry_rag_or_generator(dataset, monkeypatch):
    from src.agents.graph import agent
    from src.agents.nodes import rag_nodes
    from src.services import benchmark_dataset_service

    service = benchmark_dataset_service.BenchmarkDatasetService(MagicMock(), collection_for(dataset))
    monkeypatch.setattr(benchmark_dataset_service, "get_benchmark_dataset_service", lambda: service)
    def forbidden(*args, **kwargs):
        pytest.fail("A lookup must not generate an answer or retrieve session telemetry")
    monkeypatch.setattr(rag_nodes, "get_llm", forbidden)
    monkeypatch.setattr(rag_nodes, "get_rag_pipeline", forbidden)
    monkeypatch.setattr(rag_nodes, "_extract_telemetry_context", forbidden)
    result = await agent.ainvoke({"query": f"Tra cứu ground truth {CASE}", "session_id": "selected-session"})
    assert "99.9" in result["response"]
    assert result["report"] is None
    assert result["metadata"]["mode"] == "ground_truth_lookup"
    assert result["telemetry"] == ""


@pytest.mark.asyncio
async def test_natural_evidence_graph_uses_selected_context(lookup_services, monkeypatch):
    from src.agents.graph import agent
    from src.agents.nodes import rag_nodes
    def forbidden(*args, **kwargs):
        pytest.fail("Reference evidence lookup must not call diagnostic retrieval or generator")
    monkeypatch.setattr(rag_nodes, "get_llm", forbidden)
    monkeypatch.setattr(rag_nodes, "get_rag_pipeline", forbidden)
    monkeypatch.setattr(rag_nodes, "_extract_telemetry_context", forbidden)
    result = await agent.ainvoke({"query": "Bằng chứng của lỗi này là gì?", "session_id": "selected-session"})
    assert CASE in result["response"] and "99.9" in result["response"]
    assert result["analysis"] == "" and result["report"] is None
    assert result["metadata"]["sources"][0]["case_id"] == CASE


@pytest.mark.asyncio
async def test_api_read_and_chat_stream_contracts(dataset, client, auth_headers, monkeypatch):
    from src.api import routes
    from src.services import benchmark_dataset_service

    service = benchmark_dataset_service.BenchmarkDatasetService(MagicMock(), collection_for(dataset))
    monkeypatch.setattr(benchmark_dataset_service, "get_benchmark_dataset_service", lambda: service)
    monkeypatch.setattr(routes, "get_benchmark_dataset_service", lambda: service)
    trace = MagicMock()
    monkeypatch.setattr(routes, "get_agent_trace_service", lambda: trace)
    response = await client.get(f"/api/v1/benchmarks/{CODE}/cases/{CASE}/ground-truth?language=en")
    assert response.status_code == 200
    assert response.json()["source"]["dataset_version"] == 2
    assert (await client.get(f"/api/v1/benchmarks/{CODE}/cases/{CASE}/ground-truth?language=xx")).status_code == 422
    response = await client.post("/api/v1/chat", json={"message": f"Tra cứu ground truth {CASE}"}, headers=auth_headers)
    assert response.status_code == 200 and response.json()["report"] is None
    assert "99.9" in response.json()["response"]
    assert trace.save_trace.call_args.kwargs["step"] == "lookup"
    assert CODE in trace.save_trace.call_args.kwargs["retrieved_context"][0]
    response = await client.post(
        "/api/v1/chat/stream",
        json={"message": f"Show ground truth {CASE} in English"},
        headers=auth_headers,
    )
    events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]
    assert events[-1]["done"] is True and events[-1]["report"] is None
    assert "99.9" in "".join(event.get("token", "") for event in events)



@pytest.mark.asyncio
async def test_lookup_http_errors_are_safe(client, monkeypatch):
    from src.api import routes
    service = MagicMock()
    monkeypatch.setattr(routes, "get_benchmark_dataset_service", lambda: service)
    for error, status in [(GroundTruthNotFoundError(), 404), (GroundTruthAmbiguousError(), 409),
                          (GroundTruthInvalidError(), 422), (RuntimeError("secret-connection"), 503)]:
        service.lookup_ground_truth.side_effect = error
        result = await client.get(f"/api/v1/benchmarks/{CODE}/cases/{CASE}/ground-truth")
        assert result.status_code == status
        assert "secret-connection" not in result.text
