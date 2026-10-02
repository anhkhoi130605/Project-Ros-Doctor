from __future__ import annotations

import asyncio
from typing import Any

from src.agents.prompt.templates import build_rag_prompt
from src.agents.retrieval.pipeline import get_rag_pipeline
from src.agents.state import AgentState
from src.services.llm import get_llm


async def analyze_node(state: AgentState) -> dict[str, Any]:
    query = state.get("query", "").strip()
    if not query:
        return {"error": "Query không được để trống"}

    try:
        context, sources = await asyncio.to_thread(get_rag_pipeline().retrieve, query)
        return {
            "query": query,
            "context": context,
            "metadata": {"sources": sources, "source_count": len(sources)},
        }
    except Exception as error:
        return {"error": f"Không thể truy hồi dữ liệu: {error}"}


async def respond_node(state: AgentState) -> dict[str, Any]:
    try:
        prompt = build_rag_prompt(state["query"], state.get("context", "Không có dữ liệu phù hợp."))
        result = await get_llm().ainvoke(prompt)
        response = result.content if isinstance(result.content, str) else str(result.content)
        sources = state.get("metadata", {}).get("sources", [])
        return {
            "response": response,
            "analysis": f"Đã truy hồi {len(sources)} nguồn từ MongoDB.",
        }
    except Exception as error:
        return {"error": f"Không thể tạo câu trả lời: {error}"}
