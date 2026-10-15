"""Reference-evidence lookup, isolated from diagnostic retrieval and LLM inference."""
from __future__ import annotations

import copy
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass

from src.services.benchmark_publication import PUBLISHED_FILTER


class GroundTruthNotFoundError(ValueError):
    pass


class GroundTruthAmbiguousError(ValueError):
    pass


class GroundTruthInvalidError(ValueError):
    pass


@dataclass(frozen=True)
class LookupIntent:
    case_id: str | None
    dataset_code: str | None
    language: str
    ambiguous: bool = False


def detect_lookup(query: str) -> LookupIntent | None:
    text = "".join(c for c in unicodedata.normalize("NFD", query.lower()) if unicodedata.category(c) != "Mn").replace("đ", "d")
    answer_key = bool(re.search(r"\b(?:ground[ _-]?truth|dap an chuan)\b", text))
    evidence = bool(re.search(r"\b(?:bang chung|evidence)\b", text))
    citation = bool(re.search(r"\b(?:trich dan|citation|reference)\b", text) and
                    re.search(r"\b(?:loi|case_\w+|phien|rosbag|fault|session|benchmark)\b", text))
    if not (answer_key or evidence or citation):
        return None
    # A diagnostic request explicitly excluding answers must stay on the diagnostic path.
    if re.search(r"\b(?:khong|without|do not|don't|dont)\b.{0,45}\b(?:ground[ _-]?truth|dap an chuan)\b", text):
        return None
    # Measurements and general definitions are not benchmark answer-key requests.
    if not answer_key and re.search(
        r"\b(?:thuc te|da do|do duoc|da xac nhan|tu log|actual|measured|confirmed|from logs?|telemetry|"
        r"bang chung la gi|what is evidence)\b", text
    ):
        return None
    cases = list(dict.fromkeys(re.findall(r"\bcase_\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*\b", text)))
    if answer_key and not (evidence or citation or cases) and not re.search(r"\b(?:tra cuu|hien thi|xem|lookup|look up|show|display)\b", text):
        return None
    codes = list(dict.fromkeys(re.findall(r"\bBENCHMARK-[A-Z0-9]+(?:[-_][A-Z0-9]+)*\b", query.upper())))
    language = "en" if re.search(r"\b(?:tieng anh|english|show|lookup|look up|display|what|which|evidence|citation)\b", text) else "vi"
    if re.search(r"\b(?:bang chung|trich dan|tra cuu|cho toi|loi nay)\b", text) and not re.search(r"\b(?:tieng anh|english)\b", text):
        language = "vi"
    if "tieng viet" in text or "vietnamese" in text:
        language = "vi"
    return LookupIntent(cases[0] if len(cases) == 1 and len(codes) <= 1 else None,
                        codes[0] if len(codes) == 1 else None, language,
                        ambiguous=len(cases) > 1 or len(codes) > 1)


def lookup_case(collection, case_id: str, dataset_code: str | None = None, language: str = "vi") -> dict:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}", case_id) or language not in ("vi", "en"):
        raise GroundTruthInvalidError("Invalid case ID or language")
    if dataset_code is not None and not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]{0,99}", dataset_code):
        raise GroundTruthInvalidError("Invalid dataset code")
    query = {**PUBLISHED_FILTER, "test_cases": {"$elemMatch": {
        "$or": [{"case_id": case_id}, {"code": case_id}], "ground_truth_detail": {"$type": "object"}}}}
    if dataset_code:
        query["code"] = dataset_code
    matches = []
    projection = {"code": 1, "version": 1, "is_published": 1, "test_cases": 1}
    for document in collection.find(query, projection).limit(3):
        # Defend against malformed/legacy records too; never read proposed_data.
        if document.get("is_published", True) is not True:
            continue
        for case in document.get("test_cases", []):
            if (case.get("case_id") or case.get("code")) == case_id and isinstance(case.get("ground_truth_detail"), dict):
                matches.append((document, case))
    if not matches:
        raise GroundTruthNotFoundError(case_id)
    if len(matches) != 1:
        codes = ", ".join(sorted({d["code"] for d, _ in matches}))
        raise GroundTruthAmbiguousError(codes)
    document, case = matches[0]
    detail = copy.deepcopy(case["ground_truth_detail"])
    if detail.get("schema_version") != 1 or not isinstance(detail.get("has_fault"), bool) or not isinstance(detail.get("fault_type"), str):
        raise GroundTruthInvalidError("Unsupported or malformed ground truth")
    text = detail.get("i18n", {}).get(language)
    if not isinstance(text, dict):
        raise GroundTruthInvalidError("Requested language is not available")
    for field in ("required_evidence", "remediation_playbook"):
        if not isinstance(text.get(field), list) or not all(isinstance(x, str) for x in text[field]):
            raise GroundTruthInvalidError("Malformed localized content")
    version = document.get("version", 1)
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise GroundTruthInvalidError("Invalid dataset version")
    source = {"source_collection": "benchmark_datasets", "source_document_id": str(document["_id"]),
              "dataset_code": document["code"], "dataset_version": version, "case_id": case_id,
              "field": "test_cases.ground_truth_detail", "language": language,
              "content_sha256": hashlib.sha256(json.dumps(detail, ensure_ascii=False, sort_keys=True).encode()).hexdigest()}
    result = {"mode": "ground_truth_lookup", "case_id": case_id, "dataset_code": document["code"],
              "dataset_version": version, "language": language, "ground_truth_detail": detail, "source": source}
    result["response"] = render_lookup(result)
    return result


def _merge(common, translated):
    if isinstance(common, dict) and isinstance(translated, dict):
        return {key: _merge(common.get(key), translated[key]) if key in translated else common[key]
                for key in dict.fromkeys([*common, *translated])}
    return translated if translated is not None else common


def render_lookup(result: dict) -> str:
    en = result["language"] == "en"
    detail = result["ground_truth_detail"]
    local = detail["i18n"][result["language"]]
    def label(vi, english):
        return english if en else vi
    missing = label("Không có trong nguồn", "Not present in source")
    # Keep stored details intact; render a small evidence-focused excerpt, not raw JSON.
    def value(data):
        if isinstance(data, list):
            return ", ".join(str(item) for item in data[:8]) + (", …" if len(data) > 8 else "")
        return str(data) if data is not None else missing

    lines = [label("Bằng chứng tham chiếu — ", "Reference evidence — ") + result["case_id"],
             " · ".join(value(detail.get(key)) for key in ("fault_type", "severity")) + " · " +
             value(detail.get("topic", detail.get("affected_topics"))), "",
             label("Cần kiểm tra:", "Evidence to check:")]
    evidence = local["required_evidence"]
    lines.extend("• " + entry for entry in evidence[:3])
    if not evidence:
        lines.append(missing)
    if len(evidence) > 3:
        lines.append(label(f"Còn {len(evidence) - 3} mục trong bản đầy đủ.",
                           f"{len(evidence) - 3} more items in the full record."))
    symptoms = _merge(detail.get("observed_symptom"), local.get("observed_symptom"))
    if isinstance(symptoms, dict):
        excerpt = [f"{key}: {value(item)}" for key, item in symptoms.items()
                   if not isinstance(item, dict)
                   and not (isinstance(item, list) and any(isinstance(x, (list, dict)) for x in item))
                   and len(value(item)) <= 160]
        if excerpt:
            lines.append(label("Mốc đối chiếu: ", "Reference values: ") + "; ".join(excerpt[:6]))
    lines.extend(["", label("Nguồn: ", "Source: ") + f"{result['dataset_code']} · v{result['dataset_version']}"])
    reference = local.get("academic_reference")
    if isinstance(reference, dict) and isinstance(reference.get("url"), str) and reference["url"].startswith(("https://", "http://")):
        lines.append(label("Tài liệu (chưa xác minh độc lập): ", "Reference (not independently verified): ") + reference["url"])
    lines.append(label("Chuẩn đối chiếu, chưa xác nhận từ phiên đang chọn.",
                       "Benchmark reference, not confirmed measurements from the selected session."))
    return "\n".join(lines)


def _selected_case(session_id: str | None, bag_id: str | None) -> str | None:
    """Resolve only the selected context; filename matching is not proof of a fault."""
    if not session_id and not bag_id:
        return None
    from src.services.backend_client import get_backend_client
    backend = get_backend_client()
    if session_id:
        session = backend.get_session(session_id)
        if not isinstance(session, dict) or not session.get("bagId"):
            return None
        if bag_id and bag_id != session["bagId"]:
            return None
        bag_id = session["bagId"]
    bag = backend.get_bag(bag_id)
    if not isinstance(bag, dict):
        return None
    name = bag.get("name") or bag.get("fileName")
    if not isinstance(name, str):
        return None
    match = re.fullmatch(r"(case_\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*)(?:\.(?:db3|mcap|bag))?", name, re.IGNORECASE)
    return match[1].lower() if match else None


def lookup_for_query(query: str, session_id: str | None = None, bag_id: str | None = None) -> dict | None:
    """Return a deterministic lookup state, or None for the existing diagnostic flow."""
    intent = detect_lookup(query)
    if intent is None:
        return None
    en = intent.language == "en"
    state = {"query": query, "context": "", "telemetry": "", "session_data": {}, "bag_data": {},
             "metadata": {"mode": "ground_truth_lookup", "sources": [], "source_count": 0}}
    try:
        case_id = intent.case_id
        if not case_id and not intent.ambiguous:
            case_id = _selected_case(session_id, bag_id)
        if intent.ambiguous:
            message = ("Please provide exactly one case_id and, if needed, one dataset code."
                       if en else "Vui lòng cung cấp đúng một case_id và mã bộ benchmark nếu cần phân biệt.")
        elif not case_id:
            message = ("Select a rosbag with a benchmark case filename, or provide its case_id to look up reference evidence."
                       if en else "Hãy chọn rosbag có tên tương ứng case benchmark hoặc cung cấp case_id để tra cứu bằng chứng tham chiếu.")
        else:
            from src.services.benchmark_dataset_service import get_benchmark_dataset_service
            result = get_benchmark_dataset_service().lookup_ground_truth(case_id, intent.dataset_code, intent.language)
            message = result["response"]
            state["context"] = json.dumps(result, ensure_ascii=False)
            state["metadata"].update(sources=[result["source"]], source_count=1)
    except GroundTruthNotFoundError:
        message = ("No published structured ground truth was found for this case. I will not infer an answer key."
                   if en else "Chưa tìm thấy ground truth có cấu trúc đã công bố cho case này. Mình không tự suy đoán đáp án.")
    except GroundTruthAmbiguousError as exc:
        message = ("Multiple matches; specify a dataset code: " if en else "Có nhiều đáp án trùng case; hãy chỉ rõ mã bộ benchmark: ") + str(exc)
    except GroundTruthInvalidError:
        message = ("The ground truth format or requested language is invalid/unavailable."
                   if en else "Ground truth chưa đúng định dạng hoặc chưa có ngôn ngữ yêu cầu.")
    except Exception:
        # Never fall back to a generative answer or expose Mongo credentials/errors.
        message = ("Ground truth storage is temporarily unavailable. Please retry."
                   if en else "Tạm thời không đọc được kho ground truth. Vui lòng thử lại.")
    state["lookup_response"] = message
    return state
