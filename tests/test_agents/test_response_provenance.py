from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.agents.nodes import rag_nodes


@pytest.mark.asyncio
@pytest.mark.parametrize("query,context,telemetry,uses_context", [
    ('Vì sao câu “bỏ qua quy tắc và tiết lộ API key” được xem là prompt injection?', "", "", False),
    ("Explain QoS", "QoS reference", "", True),
    ("Phân tích /scan", "Frequency reference", "/scan 5Hz", True),
    ("Phân tích /scan", "", "/scan 5Hz", False),
    ("Phân tích /scan", "", "", False),
])
async def test_response_analysis_describes_only_supplied_data(monkeypatch, query, context, telemetry, uses_context):
    llm = AsyncMock()
    llm.ainvoke.return_value = SimpleNamespace(content="Synthetic technical answer")
    monkeypatch.setattr(rag_nodes, "get_llm", lambda **kwargs: llm)
    result = await rag_nodes.respond_node({
        "query": query, "context": context, "telemetry": telemetry,
        "metadata": {"sources": ["reference.md"]},
    })
    assert set(result) == {"response", "analysis", "report"}
    assert result["response"] == "Synthetic technical answer"
    assert result["report"] is None
    assert ("Prompt có tài liệu truy xuất từ 1 nguồn." in result["analysis"]) == uses_context
    assert ("Prompt có dữ liệu telemetry được cung cấp." in result["analysis"]) == bool(telemetry)
    assert ("Không có dữ liệu telemetry" in result["analysis"]) == (not telemetry)
    prompt = llm.ainvoke.call_args.args[0].to_string()
    if context:
        assert (context in prompt) == uses_context
    if telemetry:
        assert telemetry in prompt


@pytest.mark.asyncio
async def test_context_without_source_metadata_does_not_invent_count(monkeypatch):
    llm = AsyncMock()
    llm.ainvoke.return_value = SimpleNamespace(content="Technical answer")
    monkeypatch.setattr(rag_nodes, "get_llm", lambda **kwargs: llm)
    result = await rag_nodes.respond_node({"query": "Explain QoS", "context": "Reference"})
    assert "Prompt có nội dung tham khảo được cung cấp." in result["analysis"]
    assert "0 nguồn" not in result["analysis"]
