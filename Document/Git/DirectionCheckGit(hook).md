# Hướng dẫn cài Git hook và kiểm tra Commit message

## 1. Mục tiêu

Tài liệu này ghi lại cách nối logic kiểm tra commit message ở file `Coding-Convention/check-commit.sh` vào Git hook local, đồng thời giữ hook `pre-push` dùng để log AI prompt lên server.

## 2. Vị trí logic kiểm tra

File logic kiểm tra commit message đã có sẵn trong repo:

- `Coding-Convention/check-commit.sh`

File này đọc message commit từ tham số hook `commit-msg`, hoặc nếu không có tham số thì lấy message gần nhất từ `git log`.

## 3. Cài hook chuẩn cho repo

Repo có script cài hook chuẩn ở:

- `scripts/setup_hooks.sh` (Linux/macOS/Git Bash)
- `scripts/setup_hooks.ps1` (Windows PowerShell)

Chạy một trong hai:

```bash
bash scripts/setup_hooks.sh
```

hoặc:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```

Script này sẽ tạo đồng thời hai hook ở `.git/hooks`:

1. `commit-msg` để chạy logic kiểm tra commit message:

```bash
#!/usr/bin/env bash
repo_root=$(git rev-parse --show-toplevel)
bash "$repo_root/Coding-Convention/check-commit.sh" "$1"
```

2. `pre-push` để chạy logger AI log:

```bash
#!/usr/bin/env bash
bash scripts/_pyrun.sh scripts/log_antigravity.py --auto || true
bash scripts/_pyrun.sh scripts/submit_log.py || true
exit 0
```

Điều quan trọng là phải đảm bảo `chmod +x` (`git add`/hook trên Windows có thể mất mode) và không để hook bị cài dưới `core.hooksPath` sai.

## 4. Kiểm tra nhanh sau khi cài

Sau khi chạy script setup, hãy kiểm tra:

```bash
git rev-parse --git-path hooks
git config --get core.hooksPath
ls .git/hooks
```

Nếu `core.hooksPath` có output thì xóa:

```bash
git config --unset core.hooksPath
```

Nếu file hook cũ chưa đúng định dạng hoặc trống, hãy xóa hook và chạy lại script chuẩn:

```bash
rm -f .git/hooks/commit-msg .git/hooks/pre-push
bash scripts/setup_hooks.sh
```

Trên Windows / PowerShell, nếu hook chưa có execute bit thì dùng:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'chmod +x .git/hooks/commit-msg .git/hooks/pre-push'
```

## 5. Cấu hình biến môi trường AI log

Để hook AI log gửi lên server, phải có file `.env` chứa:

```dotenv
AI_LOG_SERVER=https://ai-logs.note.transformerlabs.ai/api/ingest
AI_LOG_API_KEY=<get-your-api-key-from-dashboard-phoenix>
AI_LOG_DIR=.ai-log
```

File mẫu đặt ở `.env.example`.

## 6. Nếu gặp lỗi hook

Nếu Git báo:

```text
error: cannot spawn .git/hooks/pre-push: No such file or directory
```

hoặc:

```text
error: cannot spawn .git/hooks/commit-msg: No such file or directory
```

nguyên nhân thường là:

1. Hook chưa được tạo vì người dùng chưa chạy `scripts/setup_hooks.sh` / `scripts/setup_hooks.ps1`.
2. `core.hooksPath` đang trỏ sang đường dẫn sai.
3. Hook `pre-push` hoặc `commit-msg` đã bị ghi thành file rỗng / sai nội dung vì script PowerShell hoặc Bash chạy trên Windows không tạo đúng quyền thực thi.

Cách xử lý:

```bash
git config --unset core.hooksPath
rm -f .git/hooks/commit-msg .git/hooks/pre-push
bash scripts/setup_hooks.sh
chmod +x .git/hooks/commit-msg .git/hooks/pre-push
```

## 7. Kết luận

- File `check-commit.sh` là logic kiểm tra.
- File `.git/hooks/commit-msg` là hook cắm logic đó vào Git.
- File `.git/hooks/pre-push` là hook AI logging.
- Không commit hook vào repository; hook ở local `.git/hooks` chỉ cài trên mỗi máy.
- Nếu team muốn đồng bộ, nên đưa logic cài hook vào script setup như `scripts/setup_hooks.sh` / `scripts/setup_hooks.ps1` để mọi người chạy một lần sau khi clone.

## 5. Cấu hình biến môi trường AI log

Để hook AI log gửi lên server, phải có file `.env` chứa:

```dotenv
AI_LOG_SERVER=https://ai-logs.note.transformerlabs.ai/api/ingest
AI_LOG_API_KEY=<get-your-api-key-from-dashboard-phoenix>
AI_LOG_DIR=.ai-log
```

File mẫu đặt ở `.env.example`.

## 6. Nếu gặp lỗi hook

Nếu Git báo:

```text
error: cannot spawn .git/hooks/pre-push: No such file or directory
```

hoặc nếu hook commit message không thấy file:

```text
chmod: cannot access '.git/hooks/commit-msg': No such file or directory
```

nguyên nhân thường là:

1. `commit-msg` hook chưa được tạo, chỉ mới chạy `chmod` lên file chưa tồn tại.
2. `core.hooksPath` đang trỏ sang đường dẫn sai.
3. `pre-push` hook đã bị tạo sai vì chạy PowerShell script sai kiểu.

Cách kiểm tra nhanh:

```bash
git rev-parse --git-path hooks
git config --get core.hooksPath
ls .git/hooks
```

Nếu `core.hooksPath` có output thì hãy xóa:

```bash
git config --unset core.hooksPath
```

Nếu `pre-push` sai, xóa hook cũ rồi cài lại từ script chuẩn:

```bash
rm -f .git/hooks/pre-push
bash scripts/setup_hooks.sh
```

## 7. Kết luận

- File `check-commit.sh` là logic kiểm tra.
- File `.git/hooks/commit-msg` là hook cắm logic đó vào Git.
- File `.git/hooks/pre-push` là hook AI logging.
- Không commit hook vào repository; hook ở local `.git/hooks` chỉ cài trên mỗi máy.
- Nếu team muốn đồng bộ, nên đưa logic cài hook vào script setup như `scripts/setup_hooks.sh` / `scripts/setup_hooks.ps1` để mọi người chạy một lần sau khi clone.
