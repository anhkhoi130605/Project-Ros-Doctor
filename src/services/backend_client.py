from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

import httpx

from src.config import Settings, get_settings

BAG_ID_PATTERN = re.compile(r"\b(bag-[a-zA-Z0-9_-]+|rosbag2_[a-zA-Z0-9_-]+)\b", re.IGNORECASE)
SESSION_ID_PATTERN = re.compile(r"\b(s-[a-zA-Z0-9_-]+|sess?-[a-zA-Z0-9_-]+|session-[a-zA-Z0-9_-]+)\b", re.IGNORECASE)


class BackendClient:
    """Client for reusing ASP.NET Core Backend WebAPI endpoints."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.base_url = self.settings.backend_api_url.rstrip("/")

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            verify=False,  # Allow dev self-signed HTTPS certificate
            timeout=5.0,
        )

    def extract_bag_id(self, text: str) -> str | None:
        """Find a bag ID or rosbag name mentioned in user text."""
        match = BAG_ID_PATTERN.search(text)
        return match.group(1) if match else None

    def extract_session_id(self, text: str) -> str | None:
        """Find a session ID mentioned in user text."""
        match = SESSION_ID_PATTERN.search(text)
        return match.group(1) if match else None

    def get_bag(self, bag_id: str) -> dict[str, Any] | None:
        """Fetch metadata, topic metrics, and Hz for a specific rosbag."""
        try:
            with self._client() as client:
                res = client.get(f"/api/bags/{bag_id}")
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None

    def list_bags(self) -> list[dict[str, Any]]:
        """List rosbags available on the backend server."""
        try:
            with self._client() as client:
                res = client.get("/api/bags")
                if res.status_code == 200:
                    data = res.json()
                    return data if isinstance(data, list) else []
        except Exception:
            pass
        return []

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        """Fetch diagnostic session results, health score, and detected issues."""
        try:
            with self._client() as client:
                res = client.get(f"/api/sessions/{session_id}")
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None

    def get_sample_bags(self) -> list[dict[str, Any]]:
        """Get list of sample bags bundled on server."""
        try:
            with self._client() as client:
                res = client.get("/api/bags/samples")
                if res.status_code == 200:
                    data = res.json()
                    return data if isinstance(data, list) else []
        except Exception:
            pass
        return []


@lru_cache(maxsize=1)
def get_backend_client() -> BackendClient:
    return BackendClient(get_settings())
