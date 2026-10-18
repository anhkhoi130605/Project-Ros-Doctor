from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from src.agents.prompt.templates import (
    build_conversational_prompt,
    build_evidence_prompt,
    build_qa_prompt,
    build_rag_prompt,
)
from src.agents.retrieval.pipeline import get_rag_pipeline
from src.agents.state import AgentState
from src.models.schemas import parse_diagnostic_report
from src.services.backend_client import get_backend_client
from src.services.conversation_intent import is_conversation_query, is_vietnamese_query
from src.services.ground_truth_lookup import lookup_for_query
from src.services.llm import get_llm
from src.services.session_evidence import is_session_evidence_query, render_session_log_excerpts, scoped_session_logs


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

    from concurrent.futures import ThreadPoolExecutor

    if bag_id and not bag_data and session_id and not session_data:
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_bag = pool.submit(client.get_bag, bag_id)
            f_sess = pool.submit(client.get_session, session_id)
            bag_data = f_bag.result()
            session_data = f_sess.result()
    else:
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
            interval = iss.get("interval") or iss.get("timeRange") or "Chưa có thời điểm cụ thể"
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

    if is_conversation_query(query):
        return {"query": query, "lookup_response": None, "context": "", "telemetry": "",
                "session_data": {}, "bag_data": {}, "metadata": {"sources": [], "source_count": 0}}

    lookup = await asyncio.to_thread(lookup_for_query, query, session_id, bag_id)
    if lookup is not None:
        return lookup

    # 1. Trích xuất Telemetry thực từ Backend C# API
    telemetry_str, bag_data, session_data = await asyncio.to_thread(
        _extract_telemetry_context, query, session_id, bag_id
    )

    # 2. Truy xuất tri thức Playbook qua RAG Pipeline (hoặc scan thư mục tri thức động)
    sources: list[str] = []
    context = ""
    try:
        retrieval_query = f"{query}\n{telemetry_str}" if telemetry_str else query
        context, sources = await asyncio.to_thread(
            lambda: get_rag_pipeline().retrieve(retrieval_query)
        )
    except Exception:
        context, sources = _search_local_playbooks(query)

    return {
        "query": query,
        "lookup_response": None,
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
    if state.get("metadata", {}).get("mode") == "ground_truth_lookup":
        return {"response": state.get("lookup_response", ""), "analysis": "", "report": None}
    query = state.get("query", "").strip()
    context = state.get("context", "")
    telemetry = state.get("telemetry", "")
    sources = state.get("metadata", {}).get("sources", [])

    if is_conversation_query(query):
        response = (
            "Xin chào! Tôi hỗ trợ giải thích ROS2, tra cứu bằng chứng tham chiếu và phân tích "
            "dữ liệu phiên Rosbag. Bạn có thể chọn Rosbag để hỏi về log, bất thường và hướng khắc phục."
            if is_vietnamese_query(query) else
            "Hello! I can explain ROS2, look up reference evidence, and help analyze Rosbag session data. "
            "Select a Rosbag to ask about its logs, anomalies, and troubleshooting options."
        )
        return {"response": response, "analysis": "", "report": None}

    # Quyết định prompt phù hợp dựa trên ngữ cảnh thực tế (không ép mẫu chẩn đoán khi hỏi thông thường)
    is_diagnostic = bool(telemetry) or any(
        kw in query.lower() for kw in ["chẩn đoán", "phân tích", "báo cáo", "sự cố", "rca", "diagnose", "analyze"]
    )

    prompt_context = context
    evidence_only = is_session_evidence_query(query)
    if evidence_only:
        excerpt = render_session_log_excerpts(context, state.get("session_id", ""), query)
        if excerpt is not None:
            # protect_respond still checks context and the entire returned envelope.
            return {"response": excerpt, "analysis": "", "report": None}
        prompt_context = scoped_session_logs(context, state.get("session_id", ""))
        sources = []  # Original retrieval metadata includes records not used here.
        prompt = build_evidence_prompt(query=query, context=prompt_context, telemetry=telemetry,
                                       session_id=state.get("session_id", ""))
    elif is_diagnostic:
        prompt = build_rag_prompt(query=query, context=context, telemetry=telemetry)
    elif any(kw in query.lower() for kw in ["hello", "hi", "chào", "xin chào", "bạn là ai", "hướng dẫn"]):
        prompt = build_conversational_prompt(query=query)
        prompt_context = ""
    else:
        prompt = build_qa_prompt(query=query, context=context)

    # Gọi mô hình LLM để suy luận động
    try:
        client_api_key = state.get("api_key")
        client_model = state.get("model")
        # Mở rộng giới hạn max_tokens cho các kịch bản đa lỗi (Multi-fault) tránh ngắt đoạn chuỗi JSON
        effective_max_tokens = 4096 if is_diagnostic else None
        llm = get_llm(model=client_model, api_key=client_api_key, max_tokens=effective_max_tokens)
        result = await llm.ainvoke(prompt)
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
    if evidence_only and report is not None:
        # Never turn an evidence-only request into a potentially fabricated report.
        # This fallback still passes through the normal output safety check.
        return {"response": (
            "Chưa thể trả bản trích bằng chứng đáng tin cậy từ dữ liệu được cung cấp. "
            "Cần đối chiếu log và timestamp của từng ghi nhận; không dùng thời lượng toàn file làm khoảng lỗi."
            if any(ord(c) > 127 for c in query) else
            "I cannot provide a reliable evidence excerpt from the supplied data yet. "
            "Please provide timestamped logs; the bag duration is not a fault interval."
        ), "analysis": "", "report": None}

    # Describe only data actually supplied to this prompt. The safety checker reads
    # analysis too; claiming real telemetry for a general question is unsupported.
    analysis_parts = []
    if prompt_context.strip():
        analysis_parts.append(
            f"Prompt có tài liệu truy xuất từ {len(sources)} nguồn."
            if sources else "Prompt có nội dung tham khảo được cung cấp."
        )
    else:
        analysis_parts.append("Prompt không có tài liệu truy xuất; trả lời dựa trên kiến thức chung.")
    analysis_parts.append(
        "Prompt có dữ liệu telemetry được cung cấp."
        if telemetry.strip() else "Không có dữ liệu telemetry kèm theo để xác nhận phép đo của phiên."
    )
    output: dict[str, Any] = {
        "response": clean_text or raw_response,
        "analysis": " ".join(analysis_parts),
        "report": report.model_dump() if report else None,
    }

    return output
