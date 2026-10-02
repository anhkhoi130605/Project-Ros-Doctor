from types import SimpleNamespace

import pytest

from src.agents.graph import agent
from src.agents.nodes import rag_nodes


@pytest.fixture
def mock_rag_dependencies(monkeypatch):
    class FakePipeline:
        def retrieve(self, query):
            return (
                "MongoDB context for the test query",
                [{"source_collection": "benchmark_datasets", "source_document_id": "test"}],
            )

    class FakeLLM:
        async def ainvoke(self, prompt):
            return SimpleNamespace(content="Mocked RAG response")

    monkeypatch.setattr(rag_nodes, "get_rag_pipeline", lambda: FakePipeline())
    monkeypatch.setattr(rag_nodes, "get_llm", lambda: FakeLLM())


@pytest.mark.asyncio
async def test_agent_basic_flow(mock_rag_dependencies):
    result = await agent.ainvoke({"query": "Hello"})
    assert "response" in result


@pytest.mark.asyncio
async def test_agent_state_structure(mock_rag_dependencies):
    result = await agent.ainvoke({"query": "Test query"})
    assert isinstance(result, dict)
    assert "query" in result
