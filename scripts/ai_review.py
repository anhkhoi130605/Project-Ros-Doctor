import os

import requests

# Lấy biến môi trường và tự động loại bỏ mọi khoảng trắng / ký tự \r\n xuống dòng
GITLAB_TOKEN = "".join((os.environ.get("GITLAB_TOKEN") or "").split())
# Hỗ trợ cả OPENROUTER_API_KEY hoặc GEMINI_API_KEY nếu đã đặt trước đó
API_KEY = "".join((os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GEMINI_API_KEY") or "").split())
CI_API_V4_URL = (os.environ.get("CI_API_V4_URL") or "").strip()
PROJECT_ID = (os.environ.get("CI_PROJECT_ID") or "").strip()
MR_IID = (os.environ.get("CI_MERGE_REQUEST_IID") or "").strip()
OPENROUTER_MODEL = (os.environ.get("OPENROUTER_MODEL") or "google/gemini-2.5-flash").strip()

if not MR_IID:
    print("Không phải Merge Request, bỏ qua.")
    exit(0)

if not GITLAB_TOKEN or not API_KEY:
    print("Lỗi: Thiếu GITLAB_TOKEN hoặc OPENROUTER_API_KEY / GEMINI_API_KEY trong CI/CD Variables.")
    exit(1)

# 1. Lấy diff từ GitLab API
headers = {"PRIVATE-TOKEN": GITLAB_TOKEN}
diff_url = f"{CI_API_V4_URL}/projects/{PROJECT_ID}/merge_requests/{MR_IID}/changes"
response = requests.get(diff_url, headers=headers)

if response.status_code != 200:
    print(f"Lỗi lấy diff từ GitLab ({response.status_code}): {response.text}")
    exit(1)

changes = response.json().get("changes", [])
diff_text = ""
for change in changes:
    diff_text += f"\nFile: {change['new_path']}\nDiff:\n{change.get('diff', '')}\n"

if not diff_text.strip():
    print("Không có thay đổi code để review.")
    exit(0)

# 2. Gọi OpenRouter API để review
prompt = f"""Bạn là Senior Code Reviewer. Hãy review phần thay đổi code (git diff) dưới đây:
- Chỉ ra lỗi tiềm ẩn (bug), vấn đề bảo mật, code smells hoặc điểm cần tối ưu hiệu năng.
- Gợi ý cách sửa cụ thể kèm tên file và dòng code nếu có.
- Trả lời bằng tiếng Việt, định dạng Markdown rõ ràng.

Diff:
{diff_text[:15000]}
"""

headers_ai = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://gitlab.com",
    "X-Title": "GitLab CI Code Review",
}

payload = {
    "model": OPENROUTER_MODEL,
    "messages": [
        {"role": "user", "content": prompt}
    ]
}

print(f"Đang gửi yêu cầu review tới OpenRouter (model: {OPENROUTER_MODEL})...")
try:
    ai_res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers_ai,
        json=payload,
        timeout=120
    )
except requests.exceptions.RequestException as e:
    print(f"Lỗi kết nối tới OpenRouter: {e}")
    exit(1)

if ai_res.status_code != 200:
    print(f"Lỗi gọi OpenRouter API ({ai_res.status_code}): {ai_res.text}")
    exit(1)

review_data = ai_res.json()
try:
    review_content = review_data["choices"][0]["message"]["content"]
except (KeyError, IndexError):
    print(f"Dữ liệu trả về từ OpenRouter không đúng định dạng: {review_data}")
    exit(1)

comment_body = f"### 🤖 AI Code Review (OpenRouter)\n\n{review_content}"

# 3. Đăng nhận xét lên Merge Request
note_url = f"{CI_API_V4_URL}/projects/{PROJECT_ID}/merge_requests/{MR_IID}/notes"
post_res = requests.post(note_url, headers=headers, json={"body": comment_body})

if post_res.status_code in (200, 201):
    print("Đã đăng nhận xét review lên Merge Request thành công!")
else:
    print(f"Lỗi khi post comment ({post_res.status_code}): {post_res.text}")
    exit(1)
