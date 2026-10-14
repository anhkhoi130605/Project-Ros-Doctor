# NeMo Guardrails trong ROS Doctor

Thư mục này là bản source **NVIDIA NeMo Guardrails library** được thu gọn từ bản
copy đã có trong ROS Doctor. Phiên bản trong `pyproject.toml`: `0.25.0.dev0`.
Đây là bản phát triển, không phải một release đã được xác nhận cho production.

Chỉ nội dung trong `src/Guardrails` được thay đổi. Lõi thư viện, test, dependency,
lockfile và giấy phép được giữ nguyên từng byte. Việc có source trong thư mục này
chưa kích hoạt guardrails cho `src/agents/graph.py` hoặc API chat của ROS Doctor.

## Những phần quan trọng được giữ

| Thành phần | Vai trò |
| --- | --- |
| `nemoguardrails/guardrails/` | Entry point Guardrails, IORails và engine registry cho input/output checks. |
| `nemoguardrails/rails/llm/` | LLMRails và RailsConfig; luồng đầy đủ có dialog/retrieval rails. |
| `nemoguardrails/colang/`, `actions/` | Parser/runtime Colang, dispatch và các action thực thi rail. |
| `nemoguardrails/library/self_check/` | Self-check input/output và kiểm tra câu trả lời theo bằng chứng truy xuất. |
| `nemoguardrails/library/hallucination/`, `factchecking/` | Các cơ chế kiểm tra grounding; có thể cần thêm model hoặc service. |
| `nemoguardrails/library/sensitive_data_detection/` | Nhận diện/ẩn dữ liệu nhạy cảm; cần optional extra phù hợp. |
| `nemoguardrails/library/injection_detection/`, `jailbreak_detection/` | Cơ chế chống injection/jailbreak; xem điều kiện model/service trong tài liệu. |
| `llm/`, `integrations/`, `embeddings/`, `kb/` | Adapter mô hình, LangChain, embedding và knowledge base. |
| `logging/`, `tracing/`, `manifests/`, `server/` | Logging, trace, catalog và API của thư viện. Giữ để tránh phá import/API nội bộ. |
| `tests/`, `schemas/` | Test upstream, fixture và snapshot dùng để kiểm tra tương thích. |
| `pyproject.toml`, `uv.lock`, `LICENSE*`, `LICENCES-3rd-party` | Packaging, phiên bản dependency và điều khoản phân phối. |

Không cắt riêng các provider hoặc thư viện rail optional chỉ vì ROS Doctor chưa
gọi trực tiếp: engine registry, catalog, Colang và public API có cơ chế nạp động.
Muốn tạo bản runtime tối thiểu cần một thay đổi riêng với cấu hình cụ thể và test
tương thích đầy đủ.

## Những phần đã loại

- `.github/`, `.devcontainer/`, `.agents/`, `.claude/`: workflow và môi trường
  phát triển của repo NVIDIA, không được project ROS Doctor dùng để chạy ứng dụng.
- `fern/`, phần lớn `docs/`, Node/Fern scripts và `package*.json`: website tài
  liệu, hình ảnh/notebook và công cụ xuất bản tài liệu upstream.
- `vscode_extension/`: extension hỗ trợ ngôn ngữ Colang, không phải runtime.
- `benchmark/`, `qa/`: benchmark hiệu năng/QA của thư viện, khác benchmark
  chẩn đoán ROS2 trong MongoDB của ROS Doctor.
- Demo server, notebook, chatbot và cấu hình nhà cung cấp không cần trong bản
  tham khảo hiện tại; Dockerfile upstream và công cụ sinh changelog/notebook.

716 file được loại khỏi bản copy. Các file này được Git theo dõi trước khi thu
gọn, nên có thể phục hồi từ lịch sử ROS Doctor. Không chạy commit hoặc push trong
bước thu gọn.

## Vì sao vẫn giữ test, một số docs và demo

740 file test/fixture được giữ nguyên. Chúng giúp kiểm tra lại bản thư viện khi
tích hợp hoặc nâng cấp; không phải số test đã chạy thành công trong bước này.

Test đọc trực tiếp `docs/telemetry.mdx`, bảng engine support, schema snapshot,
catalog docs và các demo ABC, content safety, tutorial Colang. Các tài nguyên đó
được giữ để không làm test thất bại vì mất file.

Tài liệu catalog, hướng dẫn cài đặt/tích hợp và một số demo RAG/an toàn được giữ
làm tài liệu tham khảo. Phần website đã bị loại, nên không dùng `make docs-fern`
hoặc Node scripts để build docs trong bản copy này.

## Đọc gì trước để tích hợp với ROS Doctor

1. `docs/about/rail-types.mdx`: phân biệt input/output/retrieval/tool rails.
2. `docs/getting-started/integrate-into-application.mdx`: API tích hợp.
3. `examples/configs/rag/custom_rag_output_rails/`: đặt ngữ cảnh RAG và output rails.
4. `examples/configs/rag/fact_checking/`: kiểm tra câu trả lời theo tài liệu.
5. `examples/configs/injection_detection/`, `jailbreak_detection/`: tham khảo
   kiểm tra đầu vào; không mặc định rằng các model/service trong demo đã được cài.
6. `examples/configs/streaming/`: tham khảo streaming; model trong demo là
   cấu hình upstream, không phải lựa chọn đã được kiểm chứng cho ROS Doctor.

Các cấu hình giữ lại là demo upstream, chưa phải cấu hình production cho ROS2.
Không chạy demo dùng provider thật trong unit test.

ROS Doctor còn cần quy tắc nghiệp vụ riêng: topic có tồn tại trong phiên không,
`0 <= start_sec <= end_sec <= duration`, trích dẫn có thuộc context được truy xuất
không, và khi thiếu bằng chứng thì trả kết quả chưa đủ dữ liệu. Guardrails cũng
không thay thế kiểm tra quyền truy cập session/rosbag tại backend.

## Kiểm tra bản thu gọn

Chạy tại thư mục gốc ROS Doctor trên Windows:

```powershell
.\.venv\Scripts\python.exe src\Guardrails\scripts\verify_vendor.py
```

Script này chỉ dùng Python standard library, kiểm tra fingerprint của runtime,
test, dependency và giấy phép; kiểm tra cú pháp Python, tài nguyên được test
tham chiếu và đường dẫn docs trong catalog. Nó không import runtime NeMo, gọi
LLM, gửi telemetry hoặc truy cập database.

`VENDOR_MANIFEST.json` ghi fingerprint và thống kê của lần thu gọn. Nếu chủ động
chỉnh runtime sau này, cần review/test thay đổi rồi cập nhật manifest; không tự
cập nhật manifest chỉ để bỏ qua lỗi kiểm tra.

Để chạy test runtime upstream, cần môi trường riêng có uv và dependency:

```bash
cd src/Guardrails
uv sync --locked --group dev
make test WORKERS=1 TEST="tests/guardrails tests/rails/llm tests/integrations/langchain"
```

Makefile dùng shell Unix; trên Windows dùng Git Bash hoặc WSL. Cài môi trường
này là bước riêng, không được thực hiện khi thu gọn source. Các test trên cần
được chạy trước khi coi guardrails đã tích hợp và hoạt động trong ROS Doctor.

Nguồn upstream: https://github.com/NVIDIA-NeMo/Guardrails
Tài liệu đầy đủ: https://docs.nvidia.com/nemo/guardrails/
