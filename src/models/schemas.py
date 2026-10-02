
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Tin nhắn từ user")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi từ agent")
    analysis: str = Field(default="", description="Phân tích nội bộ")


class CarlaRecordRequest(BaseModel):
    duration_seconds: int = Field(default=10, ge=1, le=3600, description="Thời gian ghi (giây)")
    sampling_interval: float = Field(default=1.0, ge=0.1, le=10.0, description="Tần số lấy mẫu (giây)")
    host: str = Field(default="127.0.0.1", description="CARLA Server host")
    port: int = Field(default=2000, description="CARLA Server port")


class CarlaRecordResponse(BaseModel):
    status: str
    message: str
    bag_path: str | None = None


class BenchmarkTestCaseResponse(BaseModel):
    code: str
    rosbag_name: str
    topic: str
    start_sec: float
    end_sec: float
    label: str
    ground_truth: str | None = None


class BenchmarkDatasetSummary(BaseModel):
    code: str
    name: str
    total_cases: int


class BenchmarkDatasetResponse(BenchmarkDatasetSummary):
    provenance: str | None = None
    group_distribution: dict[str, int] = Field(default_factory=dict)
    fault_type_distribution: dict[str, int] = Field(default_factory=dict)
    test_cases: list[BenchmarkTestCaseResponse] = Field(default_factory=list)
    created_at: Any | None = None
