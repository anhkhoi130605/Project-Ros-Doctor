"""Recognize requests for observed session evidence, not benchmark answer keys."""
import json
import re
import unicodedata

from src.services.ground_truth_lookup import detect_lookup


def is_session_evidence_query(query: str) -> bool:
    # Keep benchmark routing and explicit requests for a full diagnosis intact.
    if detect_lookup(query) is not None:
        return False
    text = "".join(c for c in unicodedata.normalize("NFD", query.lower())
                   if unicodedata.category(c) != "Mn").replace("đ", "d")
    if re.search(r"\b(?:chan doan|diagnos\w*|root cause|rca|bao cao|report)\b", text):
        return False
    return bool(re.search(r"\b(?:bang chung|evidence|logs?|telemetry)\b", text)
                and re.search(r"\b(?:thuc te|tu log|phien|rosbag|da do|actual|measured|session|from logs?)\b", text))


def scoped_session_logs(context: str, session_id: str) -> str:
    """Keep complete, explicitly session-bound log records from evidence retrieval.

    Never guess session identity from semantic similarity or a partial JSON chunk.
    This is a read-time projection, not a database/index migration. Preserve raw
    log text exactly; context safety checks still reject embedded instructions.
    """
    if not session_id:
        return ""
    records = []
    seen = set()
    for block in re.split(r"(?m)(?=^\[Source: )", context or ""):
        if not block.startswith("[Source: findings_evidence"):
            continue
        match = re.fullmatch(r"\[Source: findings_evidence(?: \| Relevance: [0-9.]+)?\]\s*(.*)", block, re.DOTALL)
        if not match:
            continue
        try:
            record = json.loads(match[1].strip())
        except (ValueError, TypeError):
            continue
        if not isinstance(record, dict) or record.get("session_id") != session_id:
            continue
        finding_id = record.get("finding_id")
        logs = record.get("raw_rosout_logs")
        if not isinstance(finding_id, str) or not finding_id or not isinstance(logs, list):
            continue
        if not logs or not all(isinstance(line, str) for line in logs):
            continue
        clean = json.dumps({"source_collection": "findings_evidence", "session_id": session_id,
                            "finding_id": finding_id, "raw_rosout_logs": logs}, ensure_ascii=False, indent=2)
        if clean not in seen:
            records.append("[Source: findings_evidence]\n" + clean)
            seen.add(clean)
    return "\n\n".join(records)


def render_session_log_excerpts(context: str, session_id: str, query: str) -> str | None:
    """Quote source records verbatim instead of asking an LLM to pair IDs and values."""
    scoped = scoped_session_logs(context, session_id)
    if not scoped:
        return None
    vietnamese = bool(re.search(r"\b(?:cho|xem|phien|bang chung|thuc te)\b", "".join(
        c for c in unicodedata.normalize("NFD", query.lower()) if unicodedata.category(c) != "Mn")))
    lines = ([f"Trích bản ghi được cung cấp cho phiên `{session_id}`.",
              "Đây là nội dung lưu trong findings_evidence, không phải xác minh độc lập file rosbag."]
             if vietnamese else [f"Records supplied for session `{session_id}`.",
                                 "These are stored findings_evidence excerpts, not an independent rosbag verification."])
    blocks = scoped.split("[Source: findings_evidence]\n")[1:]
    for block in blocks[:5]:
        record = json.loads(block)
        lines.extend(["", f"**findings_evidence / {record['finding_id']}**"])
        for log in record["raw_rosout_logs"]:
            lines.extend("> " + line for line in log.splitlines())
    lines.extend(["", "Chỉ hiển thị các bản ghi truy xuất được của đúng phiên; không suy ra dữ liệu còn thiếu."
                  if vietnamese else "Only retrieved records matching this session are shown; missing data is not inferred."])
    return "\n".join(lines)
