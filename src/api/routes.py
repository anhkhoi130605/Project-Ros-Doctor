import asyncio
import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from src.agents.graph import agent
from src.api.auth import get_current_user, require_admin
from src.models.schemas import (
    BenchmarkDatasetResponse,
    BenchmarkDatasetSummary,
    CarlaRecordRequest,
    CarlaRecordResponse,
    ChatRequest,
    ChatResponse,
)
from src.services.agent_trace_service import get_agent_trace_service
from src.services.benchmark_dataset_service import get_benchmark_dataset_service
from src.services.carla_rosbag_service import CarlaRosbagRecorder
from src.services.ground_truth_lookup import (
    GroundTruthAmbiguousError,
    GroundTruthInvalidError,
    GroundTruthNotFoundError,
)

router = APIRouter()


def lookup_trace_fields(result: dict) -> dict:
    metadata = result.get("metadata", {})
    if metadata.get("mode") != "ground_truth_lookup":
        return {}
    sources = metadata.get("sources", [])
    return {"step": "lookup", "title": "Ground truth lookup (not a session diagnosis)",
            "retrieved_context": [json.dumps(source, ensure_ascii=False, sort_keys=True) for source in sources]}


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(get_current_user)])
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat với AI agent (Non-streaming) và tự động lưu vết chẩn đoán xuống MongoDB."""
    try:
        input_state = {
            "query": request.message,
            "session_id": request.session_id,
            "bag_id": request.bag_id,
            "api_key": request.api_key,
            "model": request.model,
        }
        result = await agent.ainvoke(input_state)
        response_text = result.get("response", "")
        analysis_text = result.get("analysis", "")
        report_data = result.get("report")

        # Tự động lưu vết chẩn đoán vào collection agent_execution_traces trong MongoDB
        try:
            trace_service = get_agent_trace_service()
            await run_in_threadpool(
                trace_service.save_trace,
                session_id=request.session_id,
                bag_id=request.bag_id,
                raw_prompt=request.message,
                response=response_text,
                analysis=analysis_text,
                report=report_data,
                **lookup_trace_fields(result),
            )
        except Exception as save_err:
            print(f"[MongoDB] Cảnh báo không thể lưu agent trace: {save_err}")

        return ChatResponse(
            response=response_text,
            analysis=analysis_text,
            report=report_data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream", dependencies=[Depends(get_current_user)])
async def chat_stream(request: ChatRequest):
    """Stream chat response token-by-token using Server-Sent Events (SSE) và lưu vết xuống MongoDB."""
    async def event_generator():
        try:
            input_state = {
                "query": request.message,
                "session_id": request.session_id,
                "bag_id": request.bag_id,
                "api_key": request.api_key,
                "model": request.model,
            }
            result = await agent.ainvoke(input_state)
            full_response = result.get("response", "")
            analysis = result.get("analysis", "")
            report = result.get("report")

            # Stream words/tokens in small bursts (ChatGPT-style fast cadence)
            tokens = re.findall(r"\S+|\n+", full_response)
            chunk_size = 2  # 2 từ mỗi gói burst
            for i in range(0, len(tokens), chunk_size):
                chunk = tokens[i : i + chunk_size]
                chunk_str = ""
                for t in chunk:
                    if t.startswith("\n"):
                        chunk_str += t
                    else:
                        chunk_str += (t + " ")
                data = json.dumps({"token": chunk_str, "done": False}, ensure_ascii=False)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.008)  # 8ms per burst = ~250 từ/phút cực nhanh và mượt mà

            # Tự động lưu vết chẩn đoán vào MongoDB
            try:
                trace_service = get_agent_trace_service()
                await run_in_threadpool(
                    trace_service.save_trace,
                    session_id=request.session_id,
                    bag_id=request.bag_id,
                    raw_prompt=request.message,
                    response=full_response,
                    analysis=analysis,
                    report=report,
                    **lookup_trace_fields(result),
                )
            except Exception as save_err:
                print(f"[MongoDB] Cảnh báo không thể lưu agent trace: {save_err}")

            # Final completion event with analysis and structured report
            final_data = json.dumps({
                "token": "",
                "done": True,
                "analysis": analysis,
                "report": report
            }, ensure_ascii=False)
            yield f"data: {final_data}\n\n"

        except Exception as e:
            err_data = json.dumps({"error": str(e), "done": True}, ensure_ascii=False)
            yield f"data: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/traces", dependencies=[Depends(get_current_user)])
async def list_agent_traces(
    session_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Lấy danh sách các vết thực thi và báo cáo chẩn đoán của Agent đã lưu trong MongoDB (Yêu cầu đăng nhập)."""
    service = get_agent_trace_service()
    return await run_in_threadpool(service.list_traces, session_id=session_id, limit=limit)


@router.get("/status")
async def agent_status():
    """Kiểm tra trạng thái agent."""
    return {"status": "ready", "agent": "LangGraph Agent v1.0"}


@router.get("/benchmarks", response_model=list[BenchmarkDatasetSummary])
async def list_benchmark_datasets(
    limit: int = Query(default=50, ge=1, le=100),
) -> list[BenchmarkDatasetSummary]:
    """List benchmark summaries without loading test-case payloads."""
    service = get_benchmark_dataset_service()
    return await run_in_threadpool(service.list_datasets, limit)


@router.get("/benchmarks/{code}", response_model=BenchmarkDatasetResponse)
async def get_benchmark_dataset(code: str) -> BenchmarkDatasetResponse:
    """Load one benchmark dataset and its test cases by dataset code."""
    service = get_benchmark_dataset_service()
    dataset = await run_in_threadpool(service.get_dataset, code)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy benchmark dataset")
    return dataset


@router.get("/benchmarks/{code}/cases/{case_id}/ground-truth")
async def get_case_ground_truth(code: str, case_id: str, language: str = Query(default="vi", pattern="^(vi|en)$")):
    """Read an exact published answer key; no LLM, RAG, or database writes."""
    try:
        return await run_in_threadpool(get_benchmark_dataset_service().lookup_ground_truth, case_id, code, language)
    except GroundTruthNotFoundError:
        raise HTTPException(status_code=404, detail="Published ground truth not found") from None
    except GroundTruthAmbiguousError:
        raise HTTPException(status_code=409, detail="Duplicate case or dataset; review the benchmark data") from None
    except GroundTruthInvalidError:
        raise HTTPException(status_code=422, detail="Invalid ground truth, identifier or language") from None
    except Exception:
        raise HTTPException(status_code=503, detail="Ground truth storage is temporarily unavailable") from None


@router.post("/carla/record", response_model=CarlaRecordResponse, dependencies=[Depends(require_admin)])
async def record_carla_bag(request: CarlaRecordRequest):
    """Ghi log IMU, LiDAR, Camera từ CARLA thành ROS2 bag (Chỉ Admin)."""
    try:
        recorder = CarlaRosbagRecorder(
            host=request.host,
            port=request.port,
            sampling_interval=request.sampling_interval,
        )
        recorder.record_for_duration(seconds=request.duration_seconds)
        return CarlaRecordResponse(
            status="success",
            message=f"Đã ghi thành công {request.duration_seconds} giây dữ liệu IMU, LiDAR, Camera.",
            bag_path=str(recorder.bag_dir),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi ghi CARLA rosbag: {str(e)}")


@router.get("/carla/bags", dependencies=[Depends(get_current_user)])
async def list_carla_bags():
    """Liệt kê danh sách các ROS2 bags đã ghi trong thư mục Data (Yêu cầu đăng nhập)."""
    data_dir = Path(__file__).resolve().parent.parent / "Data"
    bags = []
    if data_dir.exists():
        for item in data_dir.glob("rosbag2_carla_*"):
            if item.is_dir():
                db3_files = [f.name for f in item.glob("*.db3")]
                yaml_files = [f.name for f in item.glob("*.yaml")]
                bags.append(
                    {
                        "name": item.name,
                        "path": str(item),
                        "db3_files": db3_files,
                        "has_yaml": len(yaml_files) > 0,
                    }
                )
    return {"total": len(bags), "bags": bags}


class UpdateAiConfigPayload(BaseModel):
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None


@router.post("/ai-config", dependencies=[Depends(require_admin)])
async def update_ai_config(payload: UpdateAiConfigPayload):
    """Cập nhật cấu hình mô hình AI và API key trực tiếp cho Agent chẩn đoán (Chỉ Admin)."""
    from urllib.parse import urlparse

    from src.config import get_settings, update_env_setting

    if payload.base_url and payload.base_url.strip():
        url = payload.base_url.strip()
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise HTTPException(
                status_code=400,
                detail="base_url không hợp lệ. Phải bắt đầu bằng http:// hoặc https://",
            )
        update_env_setting("OPENAI_BASE_URL", url)

    if payload.api_key and payload.api_key.strip():
        update_env_setting("OPENAI_API_KEY", payload.api_key.strip())
    if payload.model and payload.model.strip():
        update_env_setting("MODEL_NAME", payload.model.strip())

    settings = get_settings()
    return {
        "success": True,
        "model": settings.model_name,
        "has_api_key": bool(settings.openai_api_key),
        "message": "Đã đồng bộ cấu hình AI thành công vào hệ thống Agent.",
    }


class SaveChatHistoryPayload(BaseModel):
    model_config = {"populate_by_name": True}
    user_key: str | None = Field(default=None, alias="userKey")
    email: str | None = None
    conversations: list[dict[str, Any]] = []


@router.get("/chat/history")
async def get_user_chat_history(
    user_key: str | None = Query(default=None, alias="userKey"),
    email: str | None = Query(default=None),
):
    """Lấy lịch sử các phiên trò chuyện AI Agent của người dùng đã đồng bộ trên máy chủ."""
    service = get_agent_trace_service()
    conversations = await run_in_threadpool(service.get_user_chat_history, user_key, email)
    return {"conversations": conversations}


@router.put("/chat/history")
@router.post("/chat/history")
async def save_user_chat_history(payload: SaveChatHistoryPayload):
    """Lưu và hợp nhất lịch sử các phiên trò chuyện AI Agent của người dùng."""
    service = get_agent_trace_service()
    conversations = await run_in_threadpool(
        service.save_user_chat_history,
        payload.user_key,
        payload.conversations,
        payload.email,
    )
    return {"conversations": conversations}


