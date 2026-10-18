"""Fast-path in-process security safeguards and sanitizers.

Provides immediate, zero-latency in-memory validation and output sanitization
to prevent accidental leakage of sensitive tokens, credentials, or malicious scripts.
"""

from __future__ import annotations

import re

# Patterns that indicate secrets or sensitive credentials that MUST NEVER leak to users
SECRET_PATTERNS = [
    # OpenAI / Anthropic / AI API Keys
    re.compile(r"\b(sk-[a-zA-Z0-9_-]{20,})\b"),
    # Generic bearer / JWT tokens
    re.compile(r"\b(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b"),
    # MongoDB / DB connection strings with credentials
    re.compile(r"(mongodb(?:\+srv)?://[^\s:@]+:[^\s:@]+@[^\s/]+)"),
    # Private keys
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]

# Patterns for high-risk injection commands
HIGH_RISK_COMMANDS = [
    re.compile(r"\brm\s+-rf\s+/\b", re.IGNORECASE),
    re.compile(r"<script[\s>]", re.IGNORECASE),
]


def sanitize_output_text(text: str) -> tuple[str, bool]:
    """Sanitize output text against secret leaks or sensitive token exposure.

    Returns:
        (sanitized_text, was_modified)
    """
    if not text:
        return text, False

    modified = False
    sanitized = text

    for pattern in SECRET_PATTERNS:
        if pattern.search(sanitized):
            sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
            modified = True

    return sanitized, modified


def has_critical_injection(text: str) -> bool:
    """Fast check for extreme hostile commands embedded in text."""
    if not text:
        return False
    return any(p.search(text) for p in HIGH_RISK_COMMANDS)
