"""Wrap existing graph nodes without changing their order or API schema."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from functools import wraps

from src.safety import service
from src.services.conversation_intent import is_vietnamese_query

Node = Callable[[dict], Awaitable[dict]]
logger = logging.getLogger(__name__)


def refusal(state: dict, decision: service.Decision, stage: str) -> dict:
    # Log routing facts only: never the query, retrieved documents or provider reason.
    logger.warning(
        "Guardrails blocked stage=%s response_mode=%s unavailable=%s error_code=%s",
        stage, service.response_mode(state), decision.unavailable, decision.error_code,
    )
    # A local result uses the existing response/analysis/report contract.
    query = state.get("query", "")
    vietnamese = is_vietnamese_query(query)
    if decision.unavailable:
        message = (
            "Bộ kiểm tra an toàn tạm thời không khả dụng. Vui lòng thử lại."
            if vietnamese
            else "The safety check is temporarily unavailable. Please try again."
        )
        # Only fixed internal codes reach the client; never exception/provider text.
        code = decision.error_code or "runtime_error"
        known_codes = {"authentication", "permission", "model_or_endpoint", "timeout", "rate_limit",
                       "provider_unavailable", "provider_request", "connection", "configuration",
                       "context_too_large", "quota_exceeded", "judge_error", "runtime_error"}
        code = code if code in known_codes else "runtime_error"
        message += f" [GR_{stage.upper()}_{code.upper()}]"
    else:
        message = (
            "Nội dung chưa vượt qua kiểm tra an toàn. Vui lòng diễn đạt lại yêu cầu hoặc kiểm tra dữ liệu nguồn."
            if vietnamese
            else "The content did not pass the safety check. Please rephrase or check the source data."
        )
    return {
        "response": message,
        "analysis": "",
        "report": None,
        "metadata": {
            **state.get("metadata", {}),
            "guardrails": {"blocked": True, "stage": stage, "unavailable": decision.unavailable},
        },
    }


def protect_analyze(node: Node) -> Node:
    @wraps(node)
    async def guarded(state: dict) -> dict:
        decision = await service.check_input(state.get("query", ""))
        if not decision.allowed:
            return refusal(state, decision, "input")
        return await node(state)

    return guarded


def protect_respond(node: Node) -> Node:
    @wraps(node)
    async def guarded(state: dict) -> dict:
        if state.get("metadata", {}).get("guardrails", {}).get("blocked"):
            # The analyze -> respond edge still runs; no retrieval or generation on refusal.
            return {key: state.get(key) for key in ("response", "analysis", "report", "metadata")}
        context = service.encode(
            {
                "response_mode": service.response_mode(state),
                "context": state.get("context", ""),
                "telemetry": state.get("telemetry", ""),
            }
        )
        if state.get("context") or state.get("telemetry"):
            decision = await service.check_input(context, kind="retrieved_context")
            if not decision.allowed:
                return refusal(state, decision, "context")
        output = await node(state)
        decision = await service.check_output(state, output)
        if not decision.allowed:
            return refusal(state, decision, "output")
        return output

    return guarded
