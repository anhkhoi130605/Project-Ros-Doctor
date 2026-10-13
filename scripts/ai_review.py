import os
import requests
from google import genai

# Lấy biến môi trường và tự động loại bỏ khoảng trắng / ký tự \n thừa
GITLAB_TOKEN = (os.environ.get("GITLAB_TOKEN") or "").strip()
GEMINI_KEY = (os.environ.get("GEMINI_API_KEY") or "").strip()
CI_API_V4_URL = (os.environ.get("CI_API_V4_URL") or "").strip()
PROJECT_ID = (os.environ.get("CI_PROJECT_ID") or "").strip()
MR_IID = (os.environ.get("CI_MERGE_REQUEST_IID") or "").strip()

if not MR_IID:
    print("Không phải Merge Request, bỏ qua.")
    exit(0)

if not GITLAB_TOKEN or not GEMINI_KEY:
    print("Lỗi: Thiếu GITLAB_TOKEN hoặc GEMINI_API_KEY trong CI/CD Variables.")
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

# 2. Gọi Gemini SDK mới để review
client = genai.Client(api_key=GEMINI_KEY)

prompt = f"""Bạn là Senior Code Reviewer. Hãy review phần thay đổi code (git diff) dưới đây:
- Chỉ ra lỗi tiềm ẩn (bug), vấn đề bảo mật, code smells hoặc điểm cần tối ưu hiệu năng.
- Gợi ý cách sửa cụ thể kèm tên file và dòng code nếu có.
- Trả lời bằng tiếng Việt, định dạng Markdown rõ ràng.

Diff:
{diff_text[:15000]}
"""

ai_res = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
)
comment_body = f"### 🤖 AI Code Review\n\n{ai_res.text}"

# 3. Đăng nhận xét lên Merge Request
note_url = f"{CI_API_V4_URL}/projects/{PROJECT_ID}/merge_requests/{MR_IID}/notes"
post_res = requests.post(note_url, headers=headers, json={"body": comment_body})

if post_res.status_code in (200, 201):
    print("Đã đăng nhận xét review lên Merge Request thành công!")
else:
    print(f"Lỗi khi post comment ({post_res.status_code}): {post_res.text}")