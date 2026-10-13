import os
import requests
import google.generativeai as genai

GITLAB_TOKEN = os.environ.get("GITLAB_TOKEN")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
CI_API_V4_URL = os.environ.get("CI_API_V4_URL")
PROJECT_ID = os.environ.get("CI_PROJECT_ID")
MR_IID = os.environ.get("CI_MERGE_REQUEST_IID")

if not MR_IID:
    print("Không phải Merge Request, bỏ qua.")
    exit(0)

# 1. Lấy thay đổi diff từ GitLab API
headers = {"PRIVATE-TOKEN": GITLAB_TOKEN}
diff_url = f"{CI_API_V4_URL}/projects/{PROJECT_ID}/merge_requests/{MR_IID}/changes"
response = requests.get(diff_url, headers=headers)
changes = response.json().get("changes", [])

diff_text = ""
for change in changes:
    diff_text += f"\nFile: {change['new_path']}\nDiff:\n{change.get('diff', '')}\n"

if not diff_text.strip():
    print("Không có diff nào để review.")
    exit(0)

# 2. Gửi diff sang Gemini để review
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

prompt = f"""Bạn là Senior Code Reviewer. Hãy review phần git diff dưới đây:
- Chỉ ra lỗi tiềm ẩn (bug), vấn đề bảo mật, code smells hoặc điểm cần tối ưu.
- Đưa ra gợi ý sửa code cụ thể kèm file/dòng nếu có.
- Trả lời bằng tiếng Việt, định dạng Markdown rõ ràng.

Diff:
{diff_text[:15000]}
"""

ai_res = model.generate_content(prompt)
comment_body = f"### 🤖 AI Code Review\n\n{ai_res.text}"

# 3. Đăng nhận xét lên comment của Merge Request
note_url = f"{CI_API_V4_URL}/projects/{PROJECT_ID}/merge_requests/{MR_IID}/notes"
requests.post(note_url, headers=headers, json={"body": comment_body})
print("Đã đăng nhận xét review lên Merge Request thành công!")