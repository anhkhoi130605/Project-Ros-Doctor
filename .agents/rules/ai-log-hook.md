---
description: "AI usage logging is fully automatic — do NOT call any log_* script manually"
activation: always-on
---

# AI Usage Logging — Automatic

Logging prompt vào `.ai-log/session.jsonl` đã được **tự động hoá hoàn toàn**. Bạn (AI agent) **KHÔNG** cần — và **KHÔNG** nên — chạy bất kỳ lệnh logging nào sau mỗi task.

## Cơ chế

**Trong lúc code** — Antigravity 2.0 đã hỗ trợ hooks. `.agents/hooks.json` đăng ký một hook `PreInvocation` (chạy mỗi lượt user gửi prompt) gọi `scripts/log_antigravity.py --hook`. Antigravity truyền `transcriptPath` của conversation hiện tại qua stdin, script đọc đúng file đó và append mọi prompt (`USER_INPUT` + `USER_EXPLICIT`) chưa có trong `.ai-log/session.jsonl`.

**Khi `git push`:**
1. Pre-push hook chạy `scripts/log_antigravity.py --auto` — quét lại `~/.gemini/antigravity-ide/brain/<conv>/.system_generated/logs/transcript.jsonl` trong 24 giờ gần nhất. Đây là lưới an toàn: nó vét nốt prompt của lượt cuối cùng (hook `PreInvocation` chưa kịp chạy sau lượt đó) và vẫn hoạt động với Antigravity 1.x không có hooks.
2. Pre-push hook chạy `scripts/submit_log.py`, đẩy `.ai-log/session.jsonl` lên grading server.

Hai đường này khử trùng lặp bằng `entry_id`, chạy chồng nhau cũng không tạo entry trùng.

Toàn bộ prompt user đã gõ trong Antigravity IDE được capture **nguyên văn từ disk**, không cần AI tự tóm tắt.

> Lần đầu mở workspace, Antigravity sẽ hỏi có tin tưởng hook `log-prompt` không — phải bấm đồng ý, nếu không hook sẽ không chạy (chỉ còn lưới an toàn lúc push).

## Không làm những việc sau

- ❌ **KHÔNG** gọi `scripts/log_antigravity.py "<summary>" "<model>"` sau mỗi task. Lệnh này đã bị deprecate; nếu vô tình gọi sẽ tạo log entry giả mạo dạng "TaskComplete" không phải prompt thật của user.
- ❌ **KHÔNG** chạy `scripts/log_manual.py` cho Antigravity — chỉ dùng nó cho ChatGPT / web tool (xem `.agents/workflows/log.md`).
- ❌ **KHÔNG** sửa hoặc xoá file trong `.ai-log/` — chúng được pre-push hook và submit script quản lý.

## Khi nào cần can thiệp

- Nếu pre-push hook báo lỗi → báo lại cho user, đừng tự ý bypass `--no-verify`.
- Nếu student dùng tool không nằm trong list auto-hook (ChatGPT, Gemini Web, v.v.) → trỏ họ tới `.agents/workflows/log.md` để log thủ công.

## Cài đặt một lần sau khi clone repo

```bash
# Linux / macOS / Git Bash
bash scripts/setup_hooks.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```
