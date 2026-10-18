from __future__ import annotations

import re
import time
from functools import lru_cache
from typing import Any

import httpx

from src.config import Settings, get_settings

BAG_ID_PATTERN = re.compile(r"\b(bag-[a-zA-Z0-9_-]+|rosbag2_[a-zA-Z0-9_-]+)\b", re.IGNORECASE)
SESSION_ID_PATTERN = re.compile(r"\b(s-[a-zA-Z0-9_-]+|sess?-[a-zA-Z0-9_-]+|session-[a-zA-Z0-9_-]+)\b", re.IGNORECASE)


class BackendClient:
    """Client for reusing ASP.NET Core Backend WebAPI endpoints with connection pooling and caching."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.base_url = self.settings.backend_api_url.rstrip("/")
        self._shared_client = httpx.Client(
            base_url=self.base_url,
            verify=False,  # Allow dev self-signed HTTPS certificate
            timeout=5.0,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
        self._cache: dict[str, tuple[float, Any]] = {}

    def _client(self) -> httpx.Client:
        return self._shared_client

    def _get_from_cache(self, key: str, ttl: float = 30.0) -> Any | None:
        if key in self._cache:
            ts, val = self._cache[key]
            if time.monotonic() - ts < ttl:
                return val
            del self._cache[key]
        return None

    def _set_cache(self, key: str, val: Any) -> None:
        self._cache[key] = (time.monotonic(), val)

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
        cache_key = f"bag:{bag_id}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        try:
            res = self._client().get(f"/api/bags/{bag_id}")
            if res.status_code == 200:
                data = res.json()
                self._set_cache(cache_key, data)
                return data
        except Exception:
            pass
        return None

    def list_bags(self) -> list[dict[str, Any]]:
        """List rosbags available on the backend server."""
        try:
            res = self._client().get("/api/bags")
            if res.status_code == 200:
                data = res.json()
                return data if isinstance(data, list) else []
        except Exception:
            pass
        return []

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        """Fetch diagnostic session results, health score, and detected issues."""
        cache_key = f"sess:{session_id}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        try:
            res = self._client().get(f"/api/sessions/{session_id}")
            if res.status_code == 200:
                data = res.json()
                self._set_cache(cache_key, data)
                return data
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

    def get_latest_session_and_bag(self) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        """Fetch the most recent rosbag and its associated diagnostic session."""
        try:
            bags = self.list_bags()
            if not bags:
                return None, None
            latest_bag = bags[0]
            session_id = latest_bag.get("sessionId")
            session_data = None
            if session_id:
                session_data = self.get_session(session_id)
            return latest_bag, session_data
        except Exception:
            return None, None


@lru_cache(maxsize=1)
def get_backend_client() -> BackendClient:
    return BackendClient(get_settings())
