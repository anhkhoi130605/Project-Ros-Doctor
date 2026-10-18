"""NeMo checks only: never generate or rewrite the application's answer."""

from __future__ import annotations

import asyncio
import copy
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path

import yaml

from src.config import Settings, get_settings
from src.safety.grounding import report_citations_supported
from src.safety.verdict import RESPONSE_FORMAT, parse_verdict
from src.services.conversation_intent import is_conversation_query
from src.services.session_evidence import is_session_evidence_query, scoped_session_logs

logger = logging.getLogger(__name__)
POLICY_PATH = Path(__file__).with_name("config.yml")


@dataclass(frozen=True)
class Decision:
    allowed: bool
    unavailable: bool = False
    error_code: str | None = None


def _error_code(error: BaseException) -> str:
    """Classify nested SDK/NeMo failures without returning provider text or secrets."""
    seen: set[int] = set()
    nodes = []
    while error is not None and id(error) not in seen:
        seen.add(id(error))
        nodes.append(error)
        error = getattr(error, "inner_exception", None) or getattr(error, "__cause__", None)
    for item in nodes:
        code = getattr(item, "code", None) or getattr(item, "error_code", None)
        if code in ("insufficient_quota", "billing_hard_limit_reached"):
            return "quota_exceeded"
    for item in reversed(nodes):
        name = type(item).__name__
        if "ContextWindow" in name:
            return "context_too_large"
        status = getattr(item, "status_code", None) or getattr(item, "status", None)
        if status in (401, 403, 404, 408, 429):
            return {401: "authentication", 403: "permission", 404: "model_or_endpoint",
                    408: "timeout", 429: "rate_limit"}[status]
        if isinstance(status, int) and status >= 500:
            return "provider_unavailable"
        if status in (400, 422):
            return "provider_request"
        if isinstance(item, TimeoutError) or "Timeout" in name:
            return "timeout"
        if isinstance(item, ConnectionError) or "Connection" in name or "Connector" in name:
            return "connection"
    return "configuration" if any(isinstance(x, (ImportError, ValueError)) for x in nodes) else "runtime_error"


_BASE_POLICY_CACHE: dict | None = None


def _get_base_policy() -> dict:
    global _BASE_POLICY_CACHE
    if _BASE_POLICY_CACHE is None:
        _BASE_POLICY_CACHE = yaml.safe_load(POLICY_PATH.read_text(encoding="utf-8"))
    return copy.deepcopy(_BASE_POLICY_CACHE)


def create_rails(settings: Settings):
    # No additional outbound usage telemetry is needed for this integration.
    os.environ.setdefault("NEMO_GUARDRAILS_NO_USAGE_STATS", "1")
    from nemoguardrails import Guardrails, RailsConfig

    policy = _get_base_policy()
    # NeMo defaults to only 16,000 characters, including evidence AND the report.
    # Set a bounded application limit; do not truncate any safety-check content.
    for prompt in policy["prompts"]:
        prompt["max_length"] = settings.guardrails_max_prompt_chars
    is_azure = bool(
        settings.azure_openai_endpoint
        or (settings.openai_base_url and "openai.azure.com" in settings.openai_base_url)
    )

    if is_azure:
        raw_endpoint = (settings.azure_openai_endpoint or settings.openai_base_url or "").rstrip("/")
        if "/openai/deployments" in raw_endpoint:
            parts = raw_endpoint.split("/openai/deployments")
            raw_endpoint = parts[0].rstrip("/")
            if not settings.azure_openai_deployment_name and parts[1].strip("/"):
                azure_deployment = parts[1].strip("/").split("/")[0]
            else:
                azure_deployment = (
                    settings.azure_openai_deployment_name
                    or settings.guardrails_model
                    or settings.model_name
                )
        else:
            azure_deployment = (
                settings.azure_openai_deployment_name
                or settings.guardrails_model
                or settings.model_name
            )

        if raw_endpoint.endswith("/v1"):
            raw_endpoint = raw_endpoint[:-3]
        base_url = raw_endpoint if raw_endpoint.endswith("/openai") else f"{raw_endpoint}/openai"

        api_key = settings.azure_openai_api_key or settings.openai_api_key
        api_version = settings.azure_openai_api_version or "2024-06-01"
        parameters = {
            "base_url": base_url,
            "api_key": api_key,
            "timeout": settings.guardrails_timeout_seconds,
            "max_attempts": 1,
            "response_format": copy.deepcopy(RESPONSE_FORMAT),
            "default_headers": {
                "api-key": api_key,
            },
            "default_query": {
                "api-version": api_version,
            },
        }
        policy["models"] = [
            {
                "type": "main",
                "engine": "azure",
                "model": azure_deployment,
                "parameters": parameters,
            }
        ]
    else:
        parameters = {
            "api_key": settings.openai_api_key,
            "timeout": settings.guardrails_timeout_seconds,
            "max_attempts": 1,
            "response_format": copy.deepcopy(RESPONSE_FORMAT),
        }
        if settings.openai_base_url:
            parameters["base_url"] = settings.openai_base_url
        policy["models"] = [
            {
                "type": "main",
                "engine": "openai",
                "model": settings.guardrails_model or settings.model_name,
                "parameters": parameters,
            }
        ]
    rails = Guardrails(RailsConfig.from_content(config=policy), require_iorails=True)
    # Pinned IORails does not expose Guardrails.register_output_parser(). Register on
    # its per-instance task manager before execution; never patch global/vendor code.
    rails.rails_engine.rails_manager.task_manager.register_output_parser(parse_verdict, "ros_doctor_verdict")
    return rails


def encode(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def response_mode(state: dict) -> str:
    """Use only the application's routing metadata, not labels inside user/source text."""
    if state.get("metadata", {}).get("mode") == "ground_truth_lookup":
        return "benchmark_reference"
    if is_conversation_query(state.get("query") or ""):
        return "conversation"
    if is_session_evidence_query(state.get("query") or ""):
        return "session_evidence"
    return "diagnostic_or_general"


async def check_input(text: str, *, kind: str = "user_query") -> Decision:
    return await _check([{"role": "user", "content": encode({"kind": kind, "text": text})}], "input")


async def check_output(state: dict, output: dict) -> Decision:
    if get_settings().guardrails_enabled and not report_citations_supported(
        output, state.get("metadata", {}).get("sources", []), state.get("context", "") or ""
    ):
        return Decision(allowed=False, error_code="ungrounded_citation")
    evidence = {key: state.get(key) for key in ("query", "session_id", "bag_id")}
    evidence["response_mode"] = response_mode(state)
    evidence["sources"] = state.get("metadata", {}).get("sources", [])
    context = state.get("context") or ""
    if is_session_evidence_query(state.get("query") or ""):
        context = scoped_session_logs(context, state.get("session_id") or "")
        evidence["sources"] = []
    telemetry = state.get("telemetry") or ""
    if is_conversation_query(state.get("query") or ""):
        context, telemetry, evidence["sources"] = "", "", []
    # Keep source text readable rather than nesting escaped JSON inside JSON.
    # These blocks remain untrusted data under the classifier's system policy.
    evidence_text = (
        "REQUEST METADATA:\n" + encode(evidence)
        + "\n\nBACKEND SUMMARY (may omit details available in retrieved logs):\n"
        + (telemetry or "No telemetry supplied.")
        + "\n\nRETRIEVED CONTEXT (independent supporting evidence; check session identity):\n"
        + (context or "No retrieved context supplied.")
    )
    candidate = {key: output.get(key) for key in ("response", "analysis", "report")}
    return await _check(
        [
            {"role": "user", "content": evidence_text},
            {"role": "assistant", "content": encode(candidate)},
        ],
        "output",
    )


async def _check(messages: list[dict], direction: str) -> Decision:
    settings = get_settings()
    if not settings.guardrails_enabled:
        return Decision(allowed=True)
    try:
        from nemoguardrails.rails.llm.options import RailStatus, RailType

        # Each check owns its clients/tasks. Cleanup also runs on timeout or cancellation.
        # Fresh configuration preserves the existing /ai-config hot-update behavior.
        async with asyncio.timeout(settings.guardrails_timeout_seconds):
            for attempt in range(settings.guardrails_max_attempts):
                try:
                    async with create_rails(settings) as rails:
                        result = await rails.check_async(messages, rail_types=[RailType(direction)])
                    break
                except Exception as error:
                    code = _error_code(error)
                    if code not in {"connection", "timeout", "rate_limit", "provider_unavailable"} or attempt + 1 == settings.guardrails_max_attempts:
                        raise
                    logger.warning("Guardrails %s retry error_code=%s attempt=%s", direction, code, attempt + 1)
                    # Bounded backoff within the SAME overall deadline; never retry UNSAFE.
                    await asyncio.sleep(0.5 * (2 ** attempt))
        # Rewrites are not accepted: otherwise response and report could disagree.
        # This pinned NeMo version also represents non-HTTP judge failures as
        # BLOCKED with a sanitized '<rail> error' reason, rather than raising.
        unavailable = bool(result.reason and result.reason.startswith(f"self check {direction} error"))
        code = "judge_error" if unavailable else None
        if unavailable:
            logger.warning("Guardrails %s check unavailable error_code=%s", direction, code)
        return Decision(allowed=result.status == RailStatus.PASSED and not unavailable,
                        unavailable=unavailable, error_code=code)
    except Exception as error:
        # Never expose prompts, API credentials or provider exception text.
        code = _error_code(error)
        logger.warning("Guardrails %s check unavailable error_code=%s (%s)", direction, code, type(error).__name__)
        return Decision(allowed=False, unavailable=True, error_code=code)
