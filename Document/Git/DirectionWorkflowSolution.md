# Workflow Solution — mô tả repo và quy trình làm việc

## 1. Mục tiêu của repo

Repo hiện tại là một template chuẩn của AI20K Agent Template. Nó dùng Python + FastAPI + LangGraph làm nền, có cấu hình CI/CD, hook AI log, Docker, docs và test suite. Ngoài ra, do đội sinh viên thêm, repo cũng có folder riêng cho frontend .NET và React, cùng folder `Coding-Convention` và `Document` để lưu quy tắc và hướng dẫn nhóm.

Tổng quan công nghệ:

- Backend chính: Python/FastAPI trong `src/`
- Agent orchestration: LangGraph/LangChain
- Lint/test: `ruff` + `pytest`
- CI: GitHub Actions
- Container: `Dockerfile` + `docker-compose.yml`
- Frontend/Backend phụ: folder `WebAPI/BackEnd(ASP.Net)` và `WebAPI/FrontEnd(ReactJS)`

## 2. Cấu trúc thư mục

### 2.1 Thư mục gốc và file chuẩn

- `src/`: source code chính của hệ thống AI Agent.
  - `agents/`: chứa graph/state/nodes/tools, xử lý agent workflow.
  - `api/`: route API của FastAPI.
  - `models/`: schema dữ liệu và Pydantic model.
  - `services/`: service/LLM client.
  - `config.py`: biến môi trường và cấu hình Pydantic.
  - `main.py`: entry point ứng dụng FastAPI.

- `tests/`: bộ test cho repo, ưu tiên test API, tests agent và integration.

- `scripts/`: các script support và hook.
  - `setup_hooks.sh` / `setup_hooks.ps1`: cài hook AI log cho pre-push.
  - `_pyrun.sh` / `_pyrun.cmd`: launcher tích hợp Python cho hook.
  - `log_antigravity.py`, `log_hook.py`, `log_manual.py`, `submit_log.py`: ghi/quét/gửi AI log lên server.

- `docs/`: tài liệu chính thức của technical guidebook, có thể phục vụ đọc online và trực tiếp.

- `eval/`: folder lưu kết quả đánh giá hoặc evidence.

- `presentation/`: folder chứa slide, demo, video hoặc ảnh demo.

- `requirements.txt`: dependency chung của repo Python.

- `ruff.toml`: cấu hình lint/format ruff.

- `Dockerfile`: multi-stage Docker build cho FastAPI.

- `docker-compose.yml`: chạy service backend bằng Docker.

- `Makefile`: shortcuts command: `run`, `test`, `lint`, `format`, `typecheck`.

- `.env.example`: template biến môi trường.

- `.github/workflows/ci.yml`: CI chạy `ruff` và `pytest`.

### 2.2 Folder hook/tool riêng của AI

- `.agents/`: configuration hooks cho Antigravity.
- `.claude/`: hook cho Claude Code.
- `.codex/`: hook cho Codex CLI.
- `.cursor/`: hook cho Cursor.
- `.gemini/`: hook cho Gemini CLI.
- `.github/hooks/`: hook cho GitHub Copilot / GitHub ecosystem.

Những folder này tương ứng với framework AI log từ template, dùng để quét prompt và ghi log khi người dùng tương tác với AI tools.

### 2.3 Folder thêm của nhóm

- `WebAPI/BackEnd(ASP.Net)`: chứa ứng dụng backend .NET. Folder này riêng để tách phần server theo stack .NET.

- `WebAPI/FrontEnd(ReactJS)`: chứa ứng dụng React/Vite frontend. Folder này nên chỉ chứa UI/React app không nhúng Python source.

- `Coding-Convention/`: lưu quy ước viết code, quy tắc commit message. File `check-commit.sh` trong đây là script kiểm tra format commit message theo Conventional Commits.

- `Document/`: lưu tài liệu, hướng dẫn, note, workflow giải thích cho nhóm hoặc từng cá nhân. Folder này là nơi người dùng có thể ghi tài liệu như `DirectionCheckGit.md` và `DirectionWorkflowSolution.md`.

## 3. Workflow làm việc chuẩn

### Bước 1. Clone và cài môi trường

```bash
git clone <repo-url>
cd <repo>
python3.11 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Bước 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Điền các giá trị như:

- `OPENAI_API_KEY`
- `AI_LOG_SERVER`
- `AI_LOG_API_KEY`
- `AI_LOG_DIR`

### Bước 3. Cài Git hooks

Các hook được cài ở `.git/hooks` trên máy local và không được commit lên repo.

- `pre-push` dùng để log AI prompt và nộp log lên server qua `scripts/log_antigravity.py` và `scripts/submit_log.py`.
- `commit-msg` dùng để gọi `Coding-Convention/check-commit.sh` kiểm tra commit message.

Cách cài:

```bash
bash scripts/setup_hooks.sh
```

hoặc trên Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```

Nếu muốn kiểm tra commit message riêng, tạo hook `commit-msg` dạng:

```bash
#!/usr/bin/env bash
repo_root=$(git rev-parse --show-toplevel)
bash "$repo_root/Coding-Convention/check-commit.sh" "$1"
```

rồi:

```bash
chmod +x .git/hooks/commit-msg
```

### Bước 4. Chạy app

```bash
uvicorn src.main:app --reload --port 8000
```

hoặc:

```bash
make run
```

### Bước 5. Lint/test

```bash
ruff check src/ tests/
pytest tests/ -v
```

hoặc:

```bash
make lint
make test
```

### Bước 6. Push và nộp AI log

Khi `git push`, Git sẽ tự gọi `pre-push` hook. Hook này sẽ quét prompt AI và gửi log về grading server. Nếu hook bị sai hoặc bị thiếu file, push có thể báo lỗi dạng:

```text
error: cannot spawn .git/hooks/pre-push: No such file or directory
```

Cần kiểm tra `.git/hooks` và `core.hooksPath`.

## 4. Quy tắc về convention và docs

- `Coding-Convention/check-commit.sh` kiểm tra commit message theo format Conventional Commits.
- `CONTRIBUTING.md` mô tả quy định làm PR/commit.
- `CONTRIBUTING.md` và `README.md` cần được giữ đồng bộ với cấu trúc và workflow.
- `Document/` nên lưu note nhóm, hướng dẫn setup, checklist kỹ thuật, workflow ưu tiên, còn `docs/guide/` là tài liệu chính thức cho technical guidebook.

## 5. Gợi ý tổ chức cho đội

Hợp lý nhất là:

1. Dùng `src/` và `tests/` làm bộ source code chính.
2. Dùng `WebAPI/BackEnd(ASP.Net)` và `WebAPI/FrontEnd(ReactJS)` để tách backend/frontend phụ.
3. Dùng `Coding-Convention/` để lưu quy ước chuẩn commit/code.
4. Dùng `Document/` để lưu hướng dẫn hoạt động của nhóm.
5. Không commit file hook `.git/hooks/*` và không sửa `core.hooksPath` của git cá nhân lên repo.

## 6. Kết luận

Repo này là template có nhiều lớp và nhiều stack. Để làm việc đúng workflow, cần:

- cài Python dependency
- tạo `.env`
- cài hooks AI log và commit-msg
- chạy `ruff` + `pytest`
- đóng gói ứng dụng qua `Dockerfile`
- dùng CI GitHub Actions để auto-check

Quy trình nên được lưu trong `Document/` và `README.md` để cả team cùng theo nhịp.
