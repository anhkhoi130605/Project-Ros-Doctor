from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from src.agents.prompt.templates import (
    build_conversational_prompt,
    build_qa_prompt,
    build_rag_prompt,
)
from src.agents.retrieval.pipeline import get_rag_pipeline
from src.agents.state import AgentState
from src.models.schemas import parse_diagnostic_report
from src.services.backend_client import get_backend_client
from src.services.llm import get_llm


def _extract_telemetry_context(
    query: str,
    explicit_session_id: str | None = None,
    explicit_bag_id: str | None = None,
) -> tuple[str, dict[str, Any] | None, dict[str, Any] | None]:
    """Fetch real telemetry metrics from Backend C# APIs for a specific or requested rosbag / session."""
    client = get_backend_client()

    bag_id = explicit_bag_id or client.extract_bag_id(query)
    session_id = explicit_session_id or client.extract_session_id(query)

    bag_data: dict[str, Any] | None = None
    session_data: dict[str, Any] | None = None

    # Only fetch latest bag if user explicitly asks for a bag or session
    query_lower = query.lower()
    diag_keywords = [
        "rosbag", "file", "phiên", "session", "chẩn đoán", "phân tích", "sự cố", "lỗi",
        "kiểm tra", "báo cáo", "review", "audit", "rca"
    ]
    if not bag_id and not session_id and any(kw in query_lower for kw in diag_keywords):
        latest_bag, latest_sess = client.get_latest_session_and_bag()
        if latest_bag:
            bag_id = latest_bag.get("id")
            bag_data = latest_bag
        if latest_sess:
            session_id = latest_sess.get("id")
            session_data = latest_sess

    if bag_id and not bag_data:
        bag_data = client.get_bag(bag_id)
    if session_id and not session_data:
        session_data = client.get_session(session_id)
    if bag_data and not session_data and bag_data.get("sessionId"):
        session_data = client.get_session(bag_data["sessionId"])

    telemetry_parts: list[str] = []
    if bag_data:
        bag_name = bag_data.get("name") or bag_data.get("fileName") or bag_id
        duration = bag_data.get("duration") or bag_data.get("durationSec") or 0
        topic_count = bag_data.get("topics") if isinstance(bag_data.get("topics"), int) else bag_data.get("topicCount") or 0
        telemetry_parts.append(
            f"Thông tin Rosbag [{bag_id}]: Tên file={bag_name}, Thời lượng={duration}s, "
            f"Số topics={topic_count}, Trạng thái={bag_data.get('status')}"
        )
        topics = bag_data.get("topics")
        if isinstance(topics, list) and topics:
            formatted = [f"{t.get('topicName')} ({t.get('nominalRateHz', 0)}Hz)" for t in topics[:15] if isinstance(t, dict)]
            if formatted:
                telemetry_parts.append(f"Danh sách Topics: {', '.join(formatted)}")

    if session_data:
        sess_id = session_data.get("id") or session_id
        health_score = session_data.get("healthScore", 100)
        issues = session_data.get("issues") or []
        telemetry_parts.append(
            f"Phiên chẩn đoán [{sess_id}]: Điểm sức khỏe={health_score}/100, "
            f"Tổng số sự cố phát hiện={len(issues)}"
        )
        for iss in issues:
            title = iss.get("title") or iss.get("issueTitle", "Bất thường")
            topic = iss.get("topic", "N/A")
            severity = iss.get("severity", "medium")
            interval = iss.get("interval") or iss.get("timeRange", "Toàn bộ phiên")
            obs = iss.get("observation", "")
            telemetry_parts.append(
                f"- [Lỗi {severity.upper()}]: {title} trên Topic '{topic}' (Khoảng {interval}). {obs}"
            )

    return "\n".join(telemetry_parts), bag_data, session_data


def _search_local_playbooks(query: str, max_chars: int = 4000) -> tuple[str, list[str]]:
    """Dynamically scan knowledge directory for markdown playbooks matching query terms."""
    knowledge_dir = Path(__file__).resolve().parent.parent.parent / "Rag_knowledge"
    if not knowledge_dir.exists():
        return "", []

    query_tokens = [t.lower() for t in query.split() if len(t) > 2]
    snippets: list[str] = []
    sources: list[str] = []
    total_len = 0

    for md_file in knowledge_dir.rglob("*.md"):
        fname_lower = md_file.name.lower()
        if any(token in fname_lower for token in query_tokens):
            try:
                content = md_file.read_text(encoding="utf-8", errors="replace")
                chunk = content[:1500]
                snippets.append(f"### Playbook {md_file.name}:\n{chunk}")
                sources.append(md_file.name)
                total_len += len(chunk)
                if total_len >= max_chars:
                    break
            except Exception:
                continue

    context = "\n\n".join(snippets)
    return context, sources


async def analyze_node(state: AgentState) -> dict[str, Any]:
    """Phân tích truy vấn người dùng, trích xuất dữ liệu Telemetry và tri thức Playbook RAG."""
    query = state.get("query", "").strip()
    session_id = state.get("session_id")
    bag_id = state.get("bag_id")

    if not query:
        query = "Xin chào"

    # 1. Trích xuất Telemetry thực từ Backend C# API
    telemetry_str, bag_data, session_data = await asyncio.to_thread(
        _extract_telemetry_context, query, session_id, bag_id
    )

    # 2. Truy xuất tri thức Playbook qua RAG Pipeline (hoặc scan thư mục tri thức động)
    sources: list[str] = []
    context = ""
    try:
        retrieval_query = f"{query}\n{telemetry_str}" if telemetry_str else query
        context, sources = await asyncio.to_thread(get_rag_pipeline().retrieve, retrieval_query)
    except Exception:
        context, sources = _search_local_playbooks(query)

    return {
        "query": query,
        "session_id": session_id or (session_data.get("id") if session_data else ""),
        "bag_id": bag_id or (bag_data.get("id") if bag_data else ""),
        "context": context,
        "telemetry": telemetry_str,
        "session_data": session_data or {},
        "bag_data": bag_data or {},
        "metadata": {
            "sources": sources,
            "source_count": len(sources),
        },
    }


async def respond_node(state: AgentState) -> dict[str, Any]:
    """Sinh câu trả lời động từ mô hình LLM dựa trên dữ liệu RAG và Telemetry thực tế."""
    query = state.get("query", "").strip()
    context = state.get("context", "")
    telemetry = state.get("telemetry", "")
    sources = state.get("metadata", {}).get("sources", [])

    # Quyết định prompt phù hợp dựa trên ngữ cảnh thực tế (không ép mẫu chẩn đoán khi hỏi thông thường)
    is_diagnostic = bool(telemetry) or any(
        kw in query.lower() for kw in ["chẩn đoán", "phân tích", "báo cáo", "sự cố", "rca", "diagnose", "analyze"]
    )

    if is_diagnostic:
        prompt = build_rag_prompt(query=query, context=context, telemetry=telemetry)
    elif any(kw in query.lower() for kw in ["hello", "hi", "chào", "xin chào", "bạn là ai", "hướng dẫn"]):
        prompt = build_conversational_prompt(query=query)
    else:
        prompt = build_qa_prompt(query=query, context=context)

    # Gọi mô hình LLM để suy luận động
    try:
        result = await get_llm().ainvoke(prompt)
        raw_response = result.content if isinstance(result.content, str) else str(result.content)
    except Exception as llm_err:
        return {
            "response": (
                f"⚠️ **Không thể kết nối đến mô hình AI (LLM):** {llm_err}\n\n"
                "Vui lòng kiểm tra lại cấu hình API key trong file `.env` (ví dụ `OPENAI_API_KEY`) hoặc trong trang **Quản trị > Cấu hình AI**."
            ),
            "analysis": f"Lỗi gọi LLM: {llm_err}",
            "report": None,
        }

    # Phân tích cú pháp báo cáo nếu LLM sinh ra khối JSON chẩn đoán
    clean_text, report = parse_diagnostic_report(raw_response)

    output: dict[str, Any] = {
        "response": clean_text or raw_response,
        "analysis": f"Đã suy luận dựa trên {len(sources)} tài liệu Playbook và dữ liệu Telemetry thực tế.",
        "report": report.model_dump() if report else None,
    }

    return output
