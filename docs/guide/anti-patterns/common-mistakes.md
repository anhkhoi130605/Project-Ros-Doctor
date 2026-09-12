---
title: "Lỗi thường gặp"
description: "Những sai lầm khiến đội mất điểm và cách tránh"
weight: 1
---

## 10 lỗi làm mất điểm nhiều nhất

### 1. Bare except

```python
# ❌ Lỗi: Che mọi lỗi, không biết gì fail
try:
    result = await process(data)
except:
    pass

# ✅ Fix: Specific exception
try:
    result = await process(data)
except ValueError as e:
    logger.error(f"Invalid data: {e}")
    return {"error": str(e)}
```

### 2. Hardcoded Secrets

```python
# ❌ API key lộ trong code
client = OpenAI(api_key="sk-abc123...")

# ✅ Dùng .env + config
from src.config import get_settings
settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)
```

### 3. No Tests

```python
# Template đã có sẵn test structure trong tests/ — chỉ cần viết thêm
```

### 4. No CI/CD

```yaml
# Template đã có .github/workflows/ci.yml
# Chỉ cần push lên GitHub → CI tự chạy
```

### 5. Functions quá dài

```python
# ❌ 1 function 200+ lines
def process_everything(data):
    # ... 200 lines ...

# ✅ Tách thành nhiều functions
async def analyze(data: str) -> dict:
    """5-10 lines"""
    ...

async def transform(result: dict) -> dict:
    """5-10 lines"""
    ...
```

### 6. Không có Architecture Diagram

- BTC chấm System Design thấp → mất 2-3 points
- Template có sẵn `docs/architecture_diagram.md` để điền vào

### 7. README thiếu

- Thiếu: problem statement, tech stack, setup guide
- Dùng `README_boilerplate.md` làm khung, đừng viết lại từ đầu

### 8. Không có Evaluation Evidence

- BTC không thấy bằng chứng testing → điểm thấp
- Kết quả đo đạc để ở `eval/`, kèm số liệu và cách chạy lại

### 9. Tất cả code trong 1 file

- `main.py` vài trăm dòng thì khó maintain, khó test, khó review
- Template đã tách sẵn `agents/`, `api/`, `services/`, `models/`

### 10. Không type hints

- Code quality giảm → mất 1-2 points

## Bắt đầu từ đâu

Bốn lỗi đầu có thể xử lý gọn trong một buổi, vì template đã dựng sẵn hạ tầng cho
chúng: `.env.example` cho secrets, `tests/` cho pytest, `ruff.toml` cho lint và
`.github/workflows/ci.yml` cho CI. Phần lớn việc còn lại chỉ là dùng chúng thay
vì bỏ trống.
