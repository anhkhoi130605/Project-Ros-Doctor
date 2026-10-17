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
    raw_logs: list[str] = Field(default_factory=list, description="Danh sách log chi tiết /rosout và telemetry trace")


class DiagnosticReport(BaseModel):
    has_fault: bool = Field(default=False, description="Xác định rosbag có lỗi hay nominal")
    faults: list[FaultDetail] = Field(default_factory=list, description="Danh sách các lỗi chẩn đoán")
    summary: str = Field(default="", description="Tóm tắt kết luận chẩn đoán tổng quan")
    duration_sec: float | None = Field(default=None, description="Thời lượng phân tích")
    analyzed_topics: list[str] = Field(default_factory=list, description="Danh sách topic đã kiểm tra")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=100000, description="Tin nhắn từ user hoặc prompt chẩn đoán telemetry")
    session_id: str | None = Field(default=None, description="Mã session chẩn đoán cần hỏi đáp")
    bag_id: str | None = Field(default=None, description="Mã rosbag cần hỏi đáp")
    api_key: str | None = Field(default=None, description="Khóa API tùy chọn từ client")
    model: str | None = Field(default=None, description="Tên mô hình LLM tùy chọn từ client")


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
    case_id: str | None = None
    ground_truth_detail: dict[str, Any] | None = None


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


def repair_json_string(text: str) -> str:
    """Cơ chế tự động sửa lỗi cú pháp JSON (JSON auto-repair) tại Stage 1.

    Khắc phục các sự cố thường gặp của LLM:
    - Chuỗi bị ngắt đoạn do giới hạn token (unclosed strings, unclosed braces/brackets)
    - Dấu phẩy thừa cuối mảng/object (trailing commas)
    - Hằng số kiểu Python (True/False/None)
    - Ký tự xuống dòng chưa escape trong chuỗi
    - Chú thích thừa // hoặc /* ... */
    """
    s = text.strip()

    # Bỏ các khối markdown code block nếu chưa đóng hoặc đóng dở
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    if s.endswith("```"):
        s = re.sub(r"\s*```$", "", s)

    # Tìm vị trí bắt đầu của JSON object đầu tiên
    start_brace = s.find("{")
    if start_brace != -1:
        s = s[start_brace:]

    # Thay thế hằng số Python sang JSON chuẩn
    s = re.sub(r"\bTrue\b", "true", s)
    s = re.sub(r"\bFalse\b", "false", s)
    s = re.sub(r"\bNone\b", "null", s)

    # Xóa chú thích kiểu C++/JS (//... và /*...*/)
    s = re.sub(r"//[^\n\r]*", "", s)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.DOTALL)

    # Quét từng ký tự để chuẩn hóa chuỗi và phát hiện trạng thái kết thúc bị cắt cụt
    in_string = False
    escape = False
    stack: list[str] = []
    repaired_chars: list[str] = []

    for char in s:
        if in_string:
            if escape:
                escape = False
                repaired_chars.append(char)
            elif char == "\\":
                escape = True
                repaired_chars.append(char)
            elif char == '"':
                in_string = False
                repaired_chars.append(char)
            elif char == "\n":
                repaired_chars.append("\\n")
            elif char == "\r":
                pass
            elif char == "\t":
                repaired_chars.append("\\t")
            else:
                repaired_chars.append(char)
        else:
            if char == '"':
                in_string = True
                repaired_chars.append(char)
            elif char in "{[":
                stack.append(char)
                repaired_chars.append(char)
            elif char == "}":
                if stack and stack[-1] == "{":
                    stack.pop()
                    repaired_chars.append(char)
            elif char == "]":
                if stack and stack[-1] == "[":
                    stack.pop()
                    repaired_chars.append(char)
            else:
                repaired_chars.append(char)

    # Nếu luồng kết thúc khi đang trong chuỗi ký tự, tự động đóng dấu nháy kép
    if in_string:
        repaired_chars.append('"')

    res = "".join(repaired_chars).strip()

    # Xóa các thuộc tính dở dang ở cuối do cắt cụt (e.g. ' , "recommended_action": ' hoặc ' , ')
    res = re.sub(r',\s*$', '', res)
    res = re.sub(r',\s*"[^"]*"\s*:\s*$', '', res)
    res = re.sub(r'"[^"]*"\s*:\s*$', '', res)
    res = re.sub(r',\s*([}\]])', r'\1', res)

    # Đếm lại các cặp ngoặc mở chưa có ngoặc đóng trong chuỗi kết quả
    open_brackets: list[str] = []
    in_str = False
    esc = False
    for ch in res:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch in "{[":
                open_brackets.append(ch)
            elif ch == "}" and open_brackets and open_brackets[-1] == "{":
                open_brackets.pop()
            elif ch == "]" and open_brackets and open_brackets[-1] == "[":
                open_brackets.pop()

    # Tự động đóng các cặp ngoặc còn thiếu theo thứ tự LIFO
    for ch in reversed(open_brackets):
        if ch == "{":
            res += "}"
        elif ch == "[":
            res += "]"

    # Chuẩn hóa loại bỏ trailing comma trước các ngoặc đóng vừa thêm
    res = re.sub(r",\s*([}\]])", r"\1", res)

    return res


def parse_diagnostic_report(raw_text: str) -> tuple[str, DiagnosticReport | None]:
    """Extract and validate structured DiagnosticReport from LLM output text with Stage 1 JSON auto-repair.

    Returns:
        (human_readable_text, diagnostic_report_or_none)
    """
    clean_text = raw_text.strip()
    match = JSON_BLOCK_REGEX.search(clean_text)

    json_str: str | None = None
    if match:
        json_str = match.group(1)
        text_before = clean_text[: match.start()].strip()
        text_after = clean_text[match.end() :].strip()
        clean_text = f"{text_before}\n\n{text_after}".strip()
    elif clean_text.startswith("{") and clean_text.endswith("}"):
        json_str = clean_text
    elif "{" in clean_text and ("has_fault" in clean_text or "faults" in clean_text or "fault_type" in clean_text):
        # Trích xuất chuỗi JSON dở dang hoặc không bọc đầy đủ mã markdown
        first_brace = clean_text.find("{")
        last_brace = clean_text.rfind("}")
        if last_brace > first_brace:
            json_str = clean_text[first_brace : last_brace + 1]
            text_before = clean_text[:first_brace].strip()
            text_after = clean_text[last_brace + 1 :].strip()
            clean_text = f"{text_before}\n\n{text_after}".strip()
        else:
            json_str = clean_text[first_brace:]
            clean_text = clean_text[:first_brace].strip()

    # 1. Thử parse trực tiếp
    if json_str:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict) and ("has_fault" in parsed or "faults" in parsed):
                report = DiagnosticReport.model_validate(parsed)
                display_text = clean_text if clean_text else report.summary
                return display_text, report
        except Exception:
            pass

        # 2. Áp dụng cơ chế Tự động sửa lỗi cú pháp JSON (JSON auto-repair) tại Stage 1
        try:
            repaired_json = repair_json_string(json_str)
            parsed = json.loads(repaired_json)
            if isinstance(parsed, dict) and ("has_fault" in parsed or "faults" in parsed):
                report = DiagnosticReport.model_validate(parsed)
                display_text = clean_text if clean_text else report.summary
                return display_text, report
        except Exception:
            pass

    # 3. Fallback cứu hộ (Rescue Recovery) cho kịch bản đa lỗi bị cắt ngắn nặng
    # Quét cứu các object FaultDetail riêng lẻ nếu tồn tại trong chuỗi phản hồi
    if "fault_type" in raw_text:
        try:
            fault_matches = re.finditer(r"\{[^{}]*\"fault_type\"\s*:\s*\"([^\"]+)\"[^{}]*\}", raw_text, re.DOTALL)
            rescued_faults = []
            for fm in fault_matches:
                try:
                    f_json = repair_json_string(fm.group(0))
                    f_dict = json.loads(f_json)
                    rescued_faults.append(FaultDetail.model_validate(f_dict))
                except Exception:
                    continue

            if rescued_faults:
                rescued_report = DiagnosticReport(
                    has_fault=True,
                    faults=rescued_faults,
                    summary="Tự động khôi phục báo cáo chẩn đoán từ các phân đoạn lỗi hợp lệ (Stage 1 Auto-repair).",
                    analyzed_topics=list(dict.fromkeys(f.topic for f in rescued_faults if f.topic)),
                )
                display_text = clean_text if clean_text else rescued_report.summary
                return display_text, rescued_report
        except Exception:
            pass

    return raw_text, None
