from __future__ import annotations

import json
import re
from typing import Any, Literal

from pydantic import BaseModel, Field

JSON_BLOCK_REGEX = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


class CitationInfo(BaseModel):
    source_file: str = Field(default="", description="Tên file Playbook nguồn")
    heading: str = Field(default="", description="Tiêu đề mục hoặc section")


class FaultDetail(BaseModel):
    fault_type: Literal[
        "topic_dropout",
        "frequency_drop",
        "timestamp_anomaly",
        "tf_tree_inconsistency",
        "sensor_anomaly",
        "compound_fault",
        "nominal",
    ] | str = Field(..., description="1 trong 6 miền lỗi cốt lõi")
    sub_type: str = Field(default="", description="Kiểu lỗi cụ thể (transient, permanent, burst_loss...)")
    severity: Literal["minor", "medium", "major", "critical"] | str = Field(default="medium")
    topic: str = Field(default="", description="Topic ROS 2 bị ảnh hưởng")
    start_sec: float = Field(default=0.0)
    end_sec: float = Field(default=0.0)
    evidence: str = Field(default="", description="Bằng chứng đo đạc telemetry số liệu thực tế")
    root_cause: str = Field(default="", description="Phân tích nguyên nhân gốc rễ RCA")
    recommended_action: str = Field(default="", description="Khuyến nghị khắc phục kèm lệnh ROS 2")
    citation: CitationInfo | None = Field(default=None, description="Trích dẫn playbook")


class DiagnosticReport(BaseModel):
    has_fault: bool = Field(default=False, description="Xác định rosbag có lỗi hay nominal")
    faults: list[FaultDetail] = Field(default_factory=list, description="Danh sách các lỗi chẩn đoán")
    summary: str = Field(default="", description="Tóm tắt kết luận chẩn đoán tổng quan")
    duration_sec: float | None = Field(default=None, description="Thời lượng phân tích")
    analyzed_topics: list[str] = Field(default_factory=list, description="Danh sách topic đã kiểm tra")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=100000, description="Tin nhắn từ user hoặc prompt chẩn đoán telemetry")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi từ agent")
    analysis: str = Field(default="", description="Phân tích nội bộ")
    report: DiagnosticReport | None = Field(default=None, description="Báo cáo chẩn đoán sự cố dạng JSON nếu có")


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


def parse_diagnostic_report(raw_text: str) -> tuple[str, DiagnosticReport | None]:
    """Extract and validate structured DiagnosticReport from LLM output text.

    Returns:
        (human_readable_text, diagnostic_report_or_none)
    """
    clean_text = raw_text.strip()
    match = JSON_BLOCK_REGEX.search(clean_text)

    json_str: str | None = None
    if match:
        json_str = match.group(1)
        # Text without the JSON code block
        text_before = clean_text[: match.start()].strip()
        text_after = clean_text[match.end() :].strip()
        clean_text = f"{text_before}\n\n{text_after}".strip()
    elif clean_text.startswith("{") and clean_text.endswith("}"):
        json_str = clean_text

    if json_str:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict) and ("has_fault" in parsed or "faults" in parsed):
                report = DiagnosticReport.model_validate(parsed)
                # If clean text is empty, use report summary as response text
                display_text = clean_text if clean_text else report.summary
                return display_text, report
        except Exception:
            pass

    return raw_text, None
