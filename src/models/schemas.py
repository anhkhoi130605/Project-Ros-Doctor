
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
