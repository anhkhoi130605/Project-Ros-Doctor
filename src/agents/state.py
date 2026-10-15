from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict, total=False):
    """State schema cho LangGraph agent.

    Mỗi node đọc và ghi vào state này.
    total=False cho phép tất cả fields là optional.
    """

    query: str
    session_id: str
    bag_id: str
    context: str
    telemetry: str
    session_data: dict
    bag_data: dict
    analysis: str
    response: str
    report: dict
    error: str
    metadata: dict
    lookup_response: str | None
