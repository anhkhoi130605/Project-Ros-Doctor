from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from src.agents.graph import agent
from src.models.schemas import (
    BenchmarkDatasetResponse,
    BenchmarkDatasetSummary,
    CarlaRecordRequest,
    CarlaRecordResponse,
    ChatRequest,
    ChatResponse,
)
from src.services.benchmark_dataset_service import get_benchmark_dataset_service
from src.services.carla_rosbag_service import CarlaRosbagRecorder

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat với AI agent."""
    try:
        result = await agent.ainvoke({"query": request.message})
        return ChatResponse(
            response=result.get("response", ""),
            analysis=result.get("analysis", ""),
            report=result.get("report"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/carla/record", response_model=CarlaRecordResponse)
async def record_carla_bag(request: CarlaRecordRequest):
    """Ghi log IMU, LiDAR, Camera từ CARLA thành ROS2 bag (db3 + yaml) mỗi giây."""
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


@router.get("/carla/bags")
async def list_carla_bags():
    """Liệt kê danh sách các ROS2 bags đã ghi trong thư mục Data."""
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
