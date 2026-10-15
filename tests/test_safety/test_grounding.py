from unittest.mock import AsyncMock

import pytest

from src.safety import service
from src.safety.grounding import report_citations_supported
from src.safety.nodes import protect_respond


def candidate(name, heading=""):
    return {"response": "candidate", "analysis": "", "report": {
        "faults": [{"citation": {"source_file": name, "heading": heading}}]}}


def test_report_citation_requires_exact_retrieved_source_and_section():
    sources = [{"source_file": "imu.md", "section": "IMU > Spikes"}]
    assert report_citations_supported(candidate("imu.md", "Spikes"), sources, "source content")
    assert not report_citations_supported(candidate("guide_topic_dropout_diagnosis.md"), sources, "source content")
    assert not report_citations_supported(candidate("imu.md", "Made up heading"), sources, "source content")
    assert not report_citations_supported(candidate("imu.md"), sources, "")
    assert report_citations_supported({"report": {"faults": [{"citation": None}]}}, [], "")


def test_local_playbook_heading_cannot_be_borrowed_from_another_file():
    context = "### Playbook a.md:\n# Alpha\n\n### Playbook b.md:\n# Beta"
    assert report_citations_supported(candidate("a.md", "Alpha"), ["a.md", "b.md"], context)
    assert not report_citations_supported(candidate("a.md", "Beta"), ["a.md", "b.md"], context)


@pytest.mark.asyncio
async def test_invalid_report_citation_cannot_reach_response(mock_guardrail_model):
    node = AsyncMock(return_value=candidate("fabricated.md"))
    result = await protect_respond(node)({"query": "Diagnose", "context": "real source",
                                       "metadata": {"sources": ["real.md"]}})
    assert result["report"] is None
    assert result["metadata"]["guardrails"]["stage"] == "output"
    assert "candidate" not in result["response"]
    assert mock_guardrail_model.await_count == 1  # Context checked; citation then fails closed.


@pytest.mark.asyncio
async def test_disabled_guardrails_preserve_original_behavior(monkeypatch, mock_guardrail_model):
    settings = service.get_settings().model_copy(update={"guardrails_enabled": False})
    monkeypatch.setattr(service, "get_settings", lambda: settings)
    assert (await service.check_output({}, candidate("unknown.md"))).allowed
    mock_guardrail_model.assert_not_awaited()


@pytest.mark.asyncio
async def test_judge_receives_readable_log_context_and_session_identity(mock_guardrail_model):
    context = '[Source: findings_evidence]\n{"session_id":"session-selected", "finding_id":"f1", "raw_rosout_logs":["/imu at 7.2s: 60 m/s^2"]}'
    state = {"query": "Show actual evidence", "session_id": "session-selected", "bag_id": "bag-selected",
             "context": context, "telemetry": "Event timestamp unknown in summary"}
    await service.check_output(state, {"response": "Log records /imu at 7.2s: 60 m/s^2", "report": None})
    messages = mock_guardrail_model.call_args.args[0] if mock_guardrail_model.call_args.args else mock_guardrail_model.call_args.kwargs["messages"]
    user_content = [m["content"] for m in messages if m["role"] == "user"][-1]
    assert '"raw_rosout_logs": [\n    "/imu at 7.2s: 60 m/s^2"' in user_content
    assert '"session_id": "session-selected"' in user_content
    assert '"bag_id": "bag-selected"' in user_content
    assert "BACKEND SUMMARY" in user_content
    assert "RETRIEVED CONTEXT" in user_content
    assert "CANDIDATE TO CLASSIFY" in user_content
