"""Strict application-owned verdict schema/parser; no permissive text fallback."""
from __future__ import annotations

import json

RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "ros_doctor_safety_verdict",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {"verdict": {"type": "string", "enum": ["SAFE", "UNSAFE"]}},
            "required": ["verdict"],
            "additionalProperties": False,
        },
    },
}


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate safety verdict field")
        result[key] = value
    return result


def parse_verdict(response: str) -> list[bool]:
    # Fail closed on prose, markdown, duplicate keys, truncation and extra fields.
    if not isinstance(response, str) or len(response) > 256:
        raise ValueError("Invalid safety verdict")
    try:
        result = json.loads(response, object_pairs_hook=_unique_object)
    except (ValueError, TypeError):
        raise ValueError("Invalid safety verdict JSON") from None
    if not isinstance(result, dict) or set(result) != {"verdict"} or result["verdict"] not in ("SAFE", "UNSAFE"):
        raise ValueError("Invalid safety verdict schema")
    return [result["verdict"] == "SAFE"]
