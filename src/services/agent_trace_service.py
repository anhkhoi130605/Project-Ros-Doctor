from __future__ import annotations

import logging
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from pymongo import DESCENDING, MongoClient
from pymongo.collection import Collection

from src.config import Settings, get_settings

logger = logging.getLogger(__name__)


class AgentTraceService:
    """Service for persisting and querying AI Agent execution traces in MongoDB."""

    def __init__(self, settings: Settings, collection: Collection | None = None) -> None:
        self._settings = settings
        self._client: MongoClient | None = None

        if collection is not None:
            self._collection = collection
            return

        if not settings.mongo_connection_string:
            logger.warning("[MongoDB] MONGO_CONNECTION_STRING is not configured. Traces will not be saved.")
            self._collection = None
            return

        try:
            self._client = MongoClient(
                settings.mongo_connection_string,
                serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
                connectTimeoutMS=settings.mongo_connect_timeout_ms,
                socketTimeoutMS=settings.mongo_socket_timeout_ms,
                minPoolSize=settings.mongo_min_pool_size,
                maxPoolSize=settings.mongo_max_pool_size,
                retryReads=True,
                retryWrites=True,
                appname=settings.app_name,
            )
            self._collection = self._client[settings.mongo_database_name]["agent_execution_traces"]
            logger.info("[MongoDB] AgentTraceService connected to collection 'agent_execution_traces'.")
        except Exception as e:
            logger.error(f"[MongoDB] Failed to connect to MongoDB for agent traces: {e}")
            self._collection = None

    def save_trace(
        self,
        session_id: str | None,
        bag_id: str | None = None,
        raw_prompt: str | None = None,
        response: str | None = None,
        analysis: str | None = None,
        report: dict[str, Any] | None = None,
        retrieved_context: list[str] | None = None,
        confidence: float = 0.94,
        step: str = "01",
        title: str | None = None,
    ) -> str | None:
        """Save an Agent execution trace and diagnostic report into MongoDB."""
        if self._collection is None:
            logger.warning("[MongoDB] Skipping save_trace: collection is not available.")
            return None

        try:
            resolved_session_id = session_id or (f"sess-{bag_id}" if bag_id else "sess-live-agent")

            # Determine title & hypothesis based on report
            resolved_title = title
            resolved_hypothesis = None

            if report:
                faults = report.get("faults") or []
                summary = report.get("summary") or ""
                if not resolved_title:
                    if faults:
                        resolved_title = f"Phát hiện {len(faults)} bất thường từ phiên chẩn đoán"
                    else:
                        resolved_title = "Hệ thống danh định bình thường (Nominal Baseline)"
                resolved_hypothesis = summary or (f"Phát hiện {len(faults)} sự cố đo đạc trong rosbag" if faults else "Hệ thống hoạt động ổn định")
            elif analysis:
                resolved_title = resolved_title or "Báo cáo phân tích RCA từ Agent"
                resolved_hypothesis = analysis

            resolved_title = resolved_title or "Phân tích và chẩn đoán sự cố ROS2"
            resolved_hypothesis = resolved_hypothesis or (response[:200] if response else "Chẩn đoán tự động hoàn tất")

            document = {
                "session_id": resolved_session_id,
                "bag_id": bag_id,
                "step": step,
                "title": resolved_title,
                "retrieved_context": retrieved_context or ["Playbooks ROS2 RAG", "Telemetry Metrics"],
                "raw_prompt": raw_prompt or "",
                "hypothesis": resolved_hypothesis,
                "confidence": float(confidence),
                "report": report,
                "response": response,
                "analysis": analysis,
                "timestamp": datetime.now(UTC),
            }

            result = self._collection.insert_one(document)
            inserted_id = str(result.inserted_id)
            logger.info(f"[MongoDB] Successfully saved agent trace {inserted_id} for session '{resolved_session_id}'.")
            return inserted_id
        except Exception as e:
            logger.error(f"[MongoDB] Error saving agent execution trace: {e}")
            return None

    def list_traces(self, session_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        """List traces, optionally filtered by session_id."""
        if self._collection is None:
            return []

        try:
            query = {"session_id": session_id} if session_id else {}
            cursor = (
                self._collection.find(query, {"_id": 0})
                .sort("timestamp", DESCENDING)
                .limit(limit)
            )
            return list(cursor)
        except Exception as e:
            logger.error(f"[MongoDB] Error listing agent traces: {e}")
            return []


@lru_cache
def get_agent_trace_service() -> AgentTraceService:
    return AgentTraceService(get_settings())
