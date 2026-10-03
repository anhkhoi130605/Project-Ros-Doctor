from __future__ import annotations

import asyncio
from typing import Any

from src.agents.prompt.templates import build_rag_prompt
from src.agents.retrieval.pipeline import get_rag_pipeline
from src.agents.state import AgentState
from src.models.schemas import parse_diagnostic_report
from src.services.backend_client import get_backend_client
from src.services.llm import get_llm


def _extract_telemetry_context(query: str) -> str:
    """Fetch telemetry metrics from Backend C# APIs if a rosbag or session is referenced."""
    client = get_backend_client()
    bag_id = client.extract_bag_id(query)
    session_id = client.extract_session_id(query)

    telemetry_parts: list[str] = []

    if bag_id:
        bag_data = client.get_bag(bag_id)
        if bag_data:
            telemetry_parts.append(
                f"Dữ liệu Rosbag [{bag_id}]: Tên={bag_data.get('fileName')}, "
                f"Thời lượng={bag_data.get('durationSec')}s, "
                f"Tổng topics={bag_data.get('topicCount')}, "
                f"Trạng thái={bag_data.get('status')}"
            )
            # If topics list is present
            topics = bag_data.get("topics") or []
            if topics:
                formatted_topics = [f"{t.get('topicName')} ({t.get('nominalRateHz', 0)}Hz)" for t in topics[:10]]
                telemetry_parts.append(f"Danh sách Topics: {', '.join(formatted_topics)}")

    if session_id:
        session_data = client.get_session(session_id)
        if session_data:
            issues = session_data.get("issues") or []
            telemetry_parts.append(
                f"Phiên chẩn đoán [{session_id}]: HealthScore={session_data.get('healthScore')}, "
                f"Số lỗi phát hiện={len(issues)}"
            )
            for iss in issues[:5]:
                telemetry_parts.append(
                    f"- Lỗi: {iss.get('issueTitle')} | Topic: {iss.get('topic')} | "
                    f"Khoảng thời gian: {iss.get('timeRange')} | Mức độ: {iss.get('severity')}"
                )

    # If query generally asks for available bags
    if not bag_id and not session_id and any(kw in query.lower() for kw in ["danh sách bag", "có rosbag nào", "list bags"]):
        bags = client.list_bags()
        if bags:
            bag_names = [f"{b.get('id')}: {b.get('fileName')}" for b in bags[:5]]
            telemetry_parts.append(f"Các Rosbag hiện có trên hệ thống Backend: {'; '.join(bag_names)}")

    return "\n".join(telemetry_parts) if telemetry_parts else ""


async def analyze_node(state: AgentState) -> dict[str, Any]:
    query = state.get("query", "").strip()
    if not query:
        return {"error": "Query không được để trống"}

    try:
        # 1. Check & reuse existing Backend services for telemetry
        telemetry_str = await asyncio.to_thread(_extract_telemetry_context, query)

        # 2. Retrieve relevant Playbook knowledge from ChromaDB
        retrieval_query = f"{query}\n{telemetry_str}" if telemetry_str else query
        context, sources = await asyncio.to_thread(get_rag_pipeline().retrieve, retrieval_query)

        return {
            "query": query,
            "context": context,
            "telemetry": telemetry_str,
            "metadata": {"sources": sources, "source_count": len(sources)},
        }
    except Exception as error:
        return {"error": f"Không thể truy hồi dữ liệu: {error}"}


async def respond_node(state: AgentState) -> dict[str, Any]:
    try:
        prompt = build_rag_prompt(
            query=state["query"],
            context=state.get("context", "Không có dữ liệu phù hợp."),
            telemetry=state.get("telemetry", "Không có dữ liệu telemetry kèm theo."),
        )
        result = await get_llm().ainvoke(prompt)
        raw_response = result.content if isinstance(result.content, str) else str(result.content)
        sources = state.get("metadata", {}).get("sources", [])

        # Parse structured report from response
        clean_text, report = parse_diagnostic_report(raw_response)

        output: dict[str, Any] = {
            "response": clean_text,
            "analysis": f"Đã truy hồi {len(sources)} nguồn tri thức (ROS2 Playbook / Database).",
        }
        if report:
            output["report"] = report.model_dump()

        return output
    except Exception as error:
        return {"error": f"Không thể tạo câu trả lời: {error}"}
