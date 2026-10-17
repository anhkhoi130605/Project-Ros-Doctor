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
            self._chat_collection = self._client[settings.mongo_database_name]["chat_messages"]
            logger.info("[MongoDB] AgentTraceService connected to collection 'agent_execution_traces'.")
        except Exception as e:
            logger.error(f"[MongoDB] Failed to connect to MongoDB for agent traces: {e}")
            self._collection = None
            self._chat_collection = None
        self._memory_chat_histories: dict[str, list[dict[str, Any]]] = {}

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
                "retrieved_context": retrieved_context if retrieved_context is not None else ["Playbooks ROS2 RAG", "Telemetry Metrics"],
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

    def get_user_chat_history(self, user_key: str | None, email: str | None = None) -> list[dict[str, Any]]:
        """Retrieve and merge persisted AI chat conversations for a user across devices."""
        import json

        keys = [k.strip().lower() for k in (user_key, email) if isinstance(k, str) and k.strip()]
        if not keys:
            return []

        sources: list[list[dict[str, Any]]] = []
        mem = getattr(self, "_memory_chat_histories", {})
        for key in keys:
            if key in mem:
                sources.append(mem[key])

        chat_col = getattr(self, "_chat_collection", None)
        if chat_col is not None:
            try:
                conv_ids = [f"ai_history_{k}" for k in keys]
                docs = list(
                    chat_col.find(
                        {
                            "target_role": "__AI_CHAT_HISTORY__",
                            "$or": [
                                {"sender_id": {"$in": keys}},
                                {"sender_email": {"$in": keys}},
                                {"conversation_id": {"$in": conv_ids}},
                            ],
                        }
                    )
                    .sort("created_at", DESCENDING)
                    .limit(10)
                )
                for doc in docs:
                    raw = doc.get("content")
                    if isinstance(raw, str) and raw.strip():
                        parsed = json.loads(raw)
                        if isinstance(parsed, list):
                            sources.append(parsed)
            except Exception as e:
                logger.error(f"[MongoDB] Error loading user chat history: {e}")

        return self._merge_conversation_lists(sources)

    def save_user_chat_history(
        self,
        user_key: str | None,
        conversations: list[dict[str, Any]],
        email: str | None = None,
    ) -> list[dict[str, Any]]:
        """Merge and persist AI chat conversations for a user across devices."""
        import json

        keys = [k.strip().lower() for k in (user_key, email) if isinstance(k, str) and k.strip()]
        if not keys:
            return []

        existing = self.get_user_chat_history(user_key=user_key, email=email)
        merged = self._merge_conversation_lists([existing, conversations if isinstance(conversations, list) else []])

        if not hasattr(self, "_memory_chat_histories"):
            self._memory_chat_histories = {}
        for key in keys:
            self._memory_chat_histories[key] = merged

        chat_col = getattr(self, "_chat_collection", None)
        if chat_col is not None:
            try:
                primary_key = keys[0]
                norm_email = email.strip().lower() if isinstance(email, str) and email.strip() else ""
                conv_id = f"ai_history_{primary_key}"
                serialized = json.dumps(merged, ensure_ascii=False)
                chat_col.update_one(
                    {
                        "target_role": "__AI_CHAT_HISTORY__",
                        "$or": [
                            {"sender_id": {"$in": keys}},
                            {"sender_email": {"$in": keys}},
                            {"conversation_id": conv_id},
                        ],
                    },
                    {
                        "$set": {
                            "conversation_id": conv_id,
                            "target_role": "__AI_CHAT_HISTORY__",
                            "sender_id": primary_key,
                            "sender_name": primary_key,
                            "sender_email": norm_email,
                            "sender_role": "User",
                            "content": serialized,
                            "status": "saved",
                            "created_at": datetime.now(UTC),
                        }
                    },
                    upsert=True,
                )
            except Exception as e:
                logger.error(f"[MongoDB] Error saving user chat history: {e}")

        return merged

    @staticmethod
    def _merge_conversation_lists(sources: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
        by_id: dict[str, dict[str, Any]] = {}
        for conv_list in sources:
            if not isinstance(conv_list, list):
                continue
            for item in conv_list:
                if not isinstance(item, dict):
                    continue
                cid = item.get("id")
                updated_at = item.get("updatedAt")
                messages = item.get("messages")
                bag_id = item.get("bagId")
                session_id = item.get("sessionId")
                if (
                    not isinstance(cid, str)
                    or not cid.strip()
                    or not isinstance(updated_at, str)
                    or not isinstance(messages, list)
                    or not isinstance(bag_id, str)
                    or not isinstance(session_id, str)
                ):
                    continue
                first_user_text = ""
                normalized_msgs = []
                valid = True
                for msg in messages:
                    if not isinstance(msg, dict) or not isinstance(msg.get("text"), str) or msg.get("sender") not in ("user", "agent"):
                        valid = False
                        break
                    msg_copy = dict(msg)
                    if msg_copy.get("isStreaming"):
                        msg_copy["isStreaming"] = False
                        msg_copy["interrupted"] = True
                    if msg_copy["sender"] == "user" and not first_user_text and msg_copy["text"].strip():
                        first_user_text = " ".join(msg_copy["text"].split())[:80]
                    normalized_msgs.append(msg_copy)
                if not valid or not first_user_text:
                    continue
                candidate = {
                    **item,
                    "title": first_user_text,
                    "messages": normalized_msgs,
                }
                prev = by_id.get(cid)
                if prev is None or candidate["updatedAt"] > prev["updatedAt"] or (
                    candidate["updatedAt"] == prev["updatedAt"] and len(candidate["messages"]) >= len(prev["messages"])
                ):
                    by_id[cid] = candidate

        sorted_items = sorted(by_id.values(), key=lambda x: x.get("updatedAt", ""), reverse=True)
        return sorted_items[:50]


@lru_cache
def get_agent_trace_service() -> AgentTraceService:
    return AgentTraceService(get_settings())
