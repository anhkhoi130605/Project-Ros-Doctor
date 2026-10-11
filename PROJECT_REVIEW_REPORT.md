# Báo cáo rà soát project P-137

Ngày rà soát: **11/10/2026**. Đánh giá trên working tree hiện tại, bao gồm các thay đổi chưa commit đã có trước phiên rà soát.

## 1. Kết luận

Project có nền tảng tổ chức tốt: backend chia API/Application/Domain/Infrastructure, frontend chia feature và lazy-load trang, Python tách ingestion/chunking/embedding/retrieval. Tuy nhiên, **cần xử lý quyền truy cập, dữ liệu chẩn đoán giả lập và độ tin cậy của kiểm thử trước khi dùng với dữ liệu thật hoặc triển khai công khai**.

Các việc nên làm đầu tiên:

1. Bảo vệ API Python, đặc biệt endpoint sửa cấu hình AI; bổ sung phân quyền tài nguyên trên backend.
2. Thay kết quả analysis/report cố định bằng kết quả thực; không báo thành công khi chưa thực hiện nghiệp vụ.
3. Đưa regression backend vào CI và sửa lỗi khởi tạo test; thêm kiểm thử frontend bắt buộc.
4. Sửa Docker Python, healthcheck backend và giới hạn upload không thống nhất.
5. Tách dữ liệu benchmark đánh giá khỏi nguồn RAG, kiểm soát collection được index.

Không cần viết lại toàn bộ kiến trúc. Nên sửa từng luồng có kiểm thử hồi quy, rồi mới refactor các thành phần lớn.

## 2. Phạm vi và giới hạn

Đã khảo sát cấu trúc toàn repository và rà soát các luồng chính trong `src/`, `WebAPI/`, `tests/`, cấu hình CI, Docker, dependencies và tài liệu kiến trúc. Trọng tâm đọc mã: authentication/authorization, upload/inspection/job queue, session/report/review, AI/RAG, frontend API/cache/config/benchmark. Đã xem danh mục scripts/eval và bộ regression hiện có.

Đây là rà soát tổng thể có tập trung theo rủi ro, **không phải xác nhận đã kiểm chứng từng dòng của mọi file**. Tài liệu đào tạo trong `Document/`, fixture minh họa của `SecuritySkills/`, thư viện cài sẵn, generated output và dữ liệu nhị phân không được coi là mã production cần đánh giá từng dòng. Chưa chạy trình duyệt E2E, Docker container, CARLA, dịch vụ LLM hay kiểm thử tích hợp với SQL/MongoDB/Redis thật; chưa đo tải, audit CVE hoặc quét lịch sử Git tìm secret.

Không sửa mã ứng dụng. Ba file đã thay đổi sẵn được giữ nguyên: `src/agents/chunking/strategies.py`, `src/config.py`, `tests/test_agents/test_chunking_strategies.py`. Các bước build tạo/cập nhật output bị Git ignore.

Mức ưu tiên:

- **P1 — Cao:** ảnh hưởng quyền truy cập, tính đúng của dữ liệu, khả năng chạy hoặc độ tin cậy của release.
- **P2 — Vừa:** ảnh hưởng ổn định, hiệu năng, tính nhất quán hoặc bảo trì.
- **P3 — Thấp:** cải thiện tài liệu và trải nghiệm phát triển.

Các phát hiện dưới đây dựa trên mã đã đọc. Tác động phụ thuộc mạng triển khai, dữ liệu và lưu lượng được ghi rõ khi cần; không xem các rủi ro này là sự cố production đã xảy ra.

## 3. Kết quả kiểm chứng thực tế

| Kiểm tra | Kết quả | Ý nghĩa |
|---|---|---|
| `dotnet build "WebAPI/BackEnd(ASP.Net)/Backend.slnx" --no-restore --verbosity quiet -p:UseSharedCompilation=false -p:NodeReuse=false` | **PASS**, 0 lỗi, 17 cảnh báo | Build với packages có sẵn; chưa chứng minh restore sạch hoặc runtime hoạt động |
| `npm.cmd run build` tại frontend | **PASS**, Vite build 194 modules | Frontend biên dịch được; không thay thế kiểm thử hành vi |
| `dotnet run --project tests/RegistrationApproval/RegistrationApproval.csproj --no-restore -p:UseSharedCompilation=false -p:NodeReuse=false` | **FAIL khi khởi tạo** | `Redis:Configuration is not configured`, tại Infrastructure DI dòng 126, test Program dòng 66 |
| `.venv/Scripts/python.exe -m pytest tests/ -q --tb=short` và Ruff | **Không chạy được** | Virtualenv trỏ tới interpreter Python311 không còn tồn tại |
| Thử lại bằng `py -3.11 -m pytest ...` và Ruff | **Không chạy được** | Interpreter đăng ký tại `C:/actions-runner/...` thiếu standard library, lỗi `No module named 'encodings'` |

Lệnh `npm run build` qua PowerShell ban đầu bị ExecutionPolicy chặn wrapper `npm.ps1`; dùng entrypoint `npm.cmd` chạy thành công. Không thay đổi ExecutionPolicy. Không kết luận test Python pass/fail vì chưa tới bước thu thập test.

## 4. Các vấn đề ưu tiên cao

### R01 — API Python cho phép sửa cấu hình toàn cục mà không xác thực — P1

**Vị trí:** `src/api/routes.py:219`, `src/main.py`, `src/config.py` (`update_env_setting`), `docker-compose.yml`.

`POST /api/v1/ai-config` nhận API key, model và base URL rồi ghi `.env`; router và ứng dụng không có bước kiểm tra danh tính/quyền. Các endpoint chat, traces và CARLA cũng không có authentication. Compose publish cổng Python 8000 ra host. Bên truy cập được dịch vụ có thể thay cấu hình dùng chung, đọc trace hoặc tiêu thụ tài nguyên AI. Base URL tùy ý còn có thể chuyển hướng request LLM ra đích ngoài ý muốn; mức lộ dữ liệu/key phụ thuộc client/model sử dụng cấu hình đó.

**Đề xuất:** chỉ admin hoặc service identity được sửa cấu hình; bảo vệ các endpoint còn lại theo quyền; kiểm tra quyền với session/bag; hạn chế provider URL; áp dụng quota và rate limit. Nếu Python chỉ phục vụ nội bộ, bỏ publish cổng công khai và xác thực giao tiếp giữa dịch vụ.

**Kiểm chứng sau sửa:** request không token phải bị từ chối; user thường không sửa được cấu hình; admin hợp lệ sửa được; provider ngoài danh sách cho phép bị từ chối. CORS không thay thế authentication.

### R02 — API đọc rosbag/session và inspect thiếu ranh giới truy cập — P1

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/API/Controller/Rosbags/BagsController.cs`, `API/Controller/Sessions/SessionsController.cs`, `API/Controller/Common/BaseController.cs`, `Application/Features/Rosbags/Queries/GetBagsQuery.cs`, `Infrastructure/DependencyInjection.cs` (các đường dẫn rút gọn thuộc backend).

Các action GET bags, GET sessions và POST bags/inspect không có `[Authorize]`; BaseController cũng không có. Cấu hình authorization không đặt fallback policy bắt buộc xác thực. Query danh sách bags không lọc theo người dùng/workspace và trả cả `StorageUrl`, `UserId`. Nếu dữ liệu không được chủ đích công khai, người chưa đăng nhập có thể truy cập dữ liệu toàn hệ thống. Chỉ chặn route ở React không bảo vệ API.

**Đề xuất:** bắt buộc xác thực mặc định, đánh dấu riêng API public; xác định quyền owner/workspace/shared/admin và áp dụng vào truy vấn. Không mặc định rằng mọi Engineer được đọc mọi tài nguyên nếu nghiệp vụ chưa quy định.

**Kiểm chứng:** ma trận anonymous/User/Engineering/Admin và hai workspace; kiểm tra cả list, detail, inspect và job status.

### R03 — Inspect nhận đường dẫn filesystem tùy ý — P1

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/Infrastructure/Services/Rosbag/RosbagInspectorService.cs:458`, `API/Controller/Rosbags/BagsController.cs` (`InspectBag`).

`ResolveBagPaths` chấp nhận file/directory tồn tại từ input, tìm `.db3` đệ quy và ghép đường dẫn sample mà không kiểm tra canonical path nằm trong thư mục cho phép. Kết hợp R02, người gọi có thể yêu cầu server xử lý rosbag ngoài vùng dữ liệu dự định. Đây là thiếu giới hạn đường dẫn; chưa chứng minh đọc được nội dung file bất kỳ không phải rosbag.

**Đề xuất:** client gửi ID do server cấp; ánh xạ ID sang file trong storage cho phép. Nếu phải nhận path, chuẩn hóa và kiểm tra containment, xử lý symlink/reparse point, giới hạn kích thước/độ sâu và quyền người gọi.

**Kiểm chứng:** từ chối absolute path ngoài root, `..`, đường dẫn sibling và link thoát root; file hợp lệ trong root vẫn hoạt động.

### R04 — Start analysis lưu kết quả cố định thay vì phân tích dữ liệu — P1

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/Application/Features/Sessions/Commands/StartAnalysisCommand.cs:57`.

Handler đặt ngay `Complete`, health score 86, execution time 24 giây; seed ba issue và evidence/waveform cố định. Response chỉ liệt kê hai issue, dù lưu ba issue. Không gọi pipeline inspection trong luồng này. Có thể trả kết luận lỗi không liên quan rosbag thật và làm dữ liệu thống kê sai. Phát hiện này dành cho endpoint start; không phủ nhận hệ thống có các analyzer thật ở luồng upload/inspect khác.

**Đề xuất:** nối start vào pipeline/job thực, lưu state Pending/Processing/Completed/Failed, tính điểm và issues từ kết quả đo. Dữ liệu demo chỉ tồn tại trong fixture hoặc chế độ demo có nhãn rõ ràng. Bag không tồn tại phải trả lỗi trước khi tạo session.

**Kiểm chứng:** hai bag với telemetry khác nhau sinh kết quả tương ứng; bag sạch không tự sinh issue; response và DB có cùng số findings; chưa xử lý xong không trả Complete.

### R05 — Report tự approved, số kết luận cố định và ghi hai DB không có cơ chế phục hồi — P1

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/Application/Features/Reports/Queries/ReportQueries.cs:135`, `:141`, `:151`.

`CreateReportCommandHandler` đặt `Approved`, `ApprovedConclusionCount = 3` và response `TotalFindings = 3` mà không tính theo review thật. SQL được commit trước khi tạo Mongo snapshot; nếu Mongo lỗi thì API thất bại nhưng SQL report đã tồn tại, retry có thể tạo thêm bản ghi.

**Đề xuất:** lấy kết luận từ finding/review thật và kiểm tra điều kiện publish. Tách trạng thái PendingSnapshot/Ready hoặc dùng outbox và thao tác idempotent để phục hồi Mongo sau commit SQL; không giả định transaction EF bao phủ cả MongoDB.

**Kiểm chứng:** session có 0/1/n findings; review chưa duyệt không thành approved; Mongo ngắt kết nối không gây report mồ côi không thể phục hồi; retry không tạo report trùng.

### R06 — RAG index mọi collection, có nguy cơ lẫn dữ liệu riêng và ground truth — P1

**Vị trí:** `src/agents/retrieval/pipeline.py:59`, `src/agents/ingestion/loaders.py` (`MongoDatasetLoader`), `src/agents/nodes/rag_nodes.py:139`.

Pipeline đang dùng duyệt toàn bộ `list_collection_names()` rồi serialize toàn bộ document, thay vì chọn nguồn tri thức được duyệt. Collection chứa trace hoặc benchmark ground truth, nếu tồn tại trong database cấu hình, có thể được index và đưa vào prompt. Lời gọi retrieval hiện không truyền bộ lọc quyền. Điều này có nguy cơ lẫn dữ liệu giữa người dùng và làm kết quả đánh giá bị ảnh hưởng bởi đáp án đã đưa vào RAG.

**Đề xuất:** allowlist collection và field; tách knowledge base khỏi traces/dữ liệu nhạy cảm; mang metadata quyền vào index và bắt buộc filter. Giữ bộ test đánh giá độc lập với training/RAG, lưu manifest của corpus và dataset theo từng lần chạy.

**Kiểm chứng:** collection ngoài allowlist không được index; user không retrieve được tài liệu ngoài quyền; case đánh giá không tìm thấy đáp án của chính nó trong corpus.

### R07 — Docker Python đặt dependency ở vị trí user runtime không sử dụng được — P1

**Vị trí:** `Dockerfile` (pip `--user`, copy `/root/.local`, `USER appuser`).

Dependency được cài cho root và copy vào `/root/.local`, nhưng runtime chạy bằng appuser. PATH vẫn trỏ tới `/root/.local/bin`, nằm dưới home root; thư viện cũng không nằm trong user site của appuser. Cấu hình này có nguy cơ container không khởi động được hoặc không import được dependencies. Kết luận dựa trên Dockerfile, chưa chạy container.

**Đề xuất:** tạo virtualenv tại `/opt/venv`, copy sang runtime và đặt PATH tương ứng; hoặc cài dependencies vào vị trí dùng chung phù hợp. Smoke test image bằng đúng user runtime.

**Kiểm chứng:** build image sạch, chạy `import fastapi`, khởi động uvicorn và gọi `/health` với appuser.

### R08 — CI backend chưa chạy bộ regression hiện có; bộ regression đang lỗi — P1

**Vị trí:** `.github/workflows/ci.yml`, `WebAPI/BackEnd(ASP.Net)/Backend.slnx`, `tests/RegistrationApproval/RegistrationApproval.csproj`, `tests/RegistrationApproval/Program.cs:66`.

CI gọi `dotnet test Backend.slnx`, nhưng solution chỉ có bốn project ứng dụng. Regression nằm ngoài solution và là executable, cần chạy bằng `dotnet run`. Chạy trực tiếp trong phiên này dừng ở `Redis:Configuration is not configured` do test gọi toàn bộ Infrastructure DI trước khi thay service giả.

**Đề xuất:** sửa setup test để đăng ký đúng dependency cần thiết hoặc cấu hình giả hợp lệ và override toàn bộ external clients; thêm bước chạy regression vào CI. Về lâu dài có thể chuyển sang test project tiêu chuẩn. Pipeline phải fail nếu không chạy được test bắt buộc.

**Kiểm chứng:** CI ghi rõ số case đã chạy; cố ý làm hỏng một assertion phải khiến job fail; test không cần Redis/SQL/Mongo thật.

## 5. Độ đúng, hiệu năng và vận hành

### R09 — Healthcheck backend trỏ tới route không tồn tại — P2

**Vị trí:** `docker-compose.yml`, `WebAPI/BackEnd(ASP.Net)/API/Program.cs:118`, `API/Controller/Dashboard/DashboardController.cs`.

Compose gọi `/api/dashboard/health`, nhưng controller chỉ có action `stats`. Program đăng ký `AddHealthChecks()` mà chưa map endpoint. Vì vậy probe không thể xác nhận healthy như dự định; còn cần xác nhận image runtime có `curl` vì Dockerfile không cài công cụ này.

**Sửa/kiểm chứng:** map liveness endpoint và trỏ probe đúng đường dẫn; thêm readiness phù hợp với dependency cần thiết. Chạy probe từ trong container, xác nhận mã trả về và công cụ sử dụng.

### R10 — Upload quảng bá 2 GB nhưng Kestrel chỉ cho 30 MB — P2

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/API/Program.cs:18`, `API/Controller/Rosbags/BagsController.cs` (các action upload).

`RequestFormLimits` đặt multipart limit 2 GB, nhưng global `MaxRequestBodySize` là 30 MB và action không override request body size. Khi chạy Kestrel với cấu hình này, file lớn hơn 30 MB có thể bị 413 trước khi xử lý theo kỳ vọng 2 GB.

**Sửa/kiểm chứng:** thống nhất limit ở proxy, Kestrel, multipart và UI; chọn limit dựa trên tài nguyên xử lý. Kiểm tra file ngay dưới/trên ngưỡng, upload hủy giữa chừng và dung lượng disk tạm.

### R11 — Queue hữu hạn nhưng số task chờ và lịch sử job không hữu hạn — P2

**Vị trí:** `Infrastructure/Services/Rosbag/RosbagJobQueue.cs:13`, `:17`; `Infrastructure/Services/Rosbag/RosbagJobBackgroundService.cs:42`, `:64` trong backend.

Reader rút job liên tục rồi fire-and-forget `ProcessJobWithThrottlingAsync`. Semaphore chỉ giới hạn hai job đang xử lý, không giới hạn số task đã lấy khỏi channel đang đợi. Dictionary `_jobs` không có eviction và giữ cả result. Queue và trạng thái chỉ ở RAM nên restart mất job, nhiều replica không có trạng thái chung. Cancellation ở `WaitAsync` nằm trước try/finally xử lý file.

**Sửa/kiểm chứng:** dùng số worker cố định đọc và await job; quản lý lifecycle task, retention/TTL cho kết quả; bổ sung job store bền vững nếu cần restart/retry. Load test vượt capacity, shutdown khi đang chờ, xác nhận không tăng task/RAM/disk không giới hạn và không bỏ sót file tạm.

### R12 — Pagination trả tổng số bản ghi bằng kích thước trang — P2

**Vị trí:** `API/Controller/Rosbags/BagsController.cs` (`GetBags`), `Application/Features/Rosbags/Queries/GetBagsQuery.cs` trong backend.

Handler đã Skip/Take nhưng controller dùng `result.Count` làm total. Ví dụ có 120 bag, page size 20 thì total trả về 20. Nếu không truyền pagination, query lấy toàn bộ dữ liệu; sau đó còn lấy tất cả session của các bag để chọn session mới nhất trong memory.

**Sửa/kiểm chứng:** handler trả items và count từ cùng bộ lọc; áp dụng pagination mặc định, stable ordering và chọn latest session ở DB khi cần. Test 0/1/nhiều trang, trang cuối và quyền truy cập trong count.

### R13 — CARLA recorder chặn event loop FastAPI — P2

**Vị trí:** `src/api/routes.py:182`, `src/services/carla_rosbag_service.py:613`, `src/models/schemas.py` (`CarlaRecordRequest`).

Async route gọi trực tiếp hàm đồng bộ `record_for_duration`, bên trong có `time.sleep`; duration cho phép tới 3600 giây. Một request có thể chặn worker event loop, làm chat/health chậm hoặc không phản hồi.

**Sửa/kiểm chứng:** đưa ghi bag sang job có concurrency limit, timeout và cancellation; chuyển sang threadpool chỉ là bước tối thiểu. Gọi health/chat đồng thời khi đang record và đo latency.

### R14 — SSE hiện chia nhỏ câu trả lời đã hoàn thành, chưa stream từ model — P2

**Vị trí:** `src/api/routes.py:79`.

Endpoint chờ `agent.ainvoke()` hoàn tất rồi mới tách câu trả lời thành cụm từ và sleep để phát từng đoạn. Time-to-first-token vẫn bằng thời gian xử lý toàn bộ, không đạt lợi ích latency của streaming thật.

**Sửa/kiểm chứng:** sử dụng sự kiện stream từ graph/model, giữ event riêng cho report hoàn chỉnh và xử lý disconnect. Đo thời điểm token đầu tiên so với thời điểm model kết thúc; kiểm tra xuống dòng và dấu cách không bị thay đổi ngoài ý muốn.

### R15 — TLS verification bị tắt vô điều kiện, lỗi backend bị biến thành không có dữ liệu — P2

**Vị trí:** `src/services/backend_client.py:24` và các hàm `get_bag`, `list_bags`, `get_session`.

`verify=False` áp dụng cho mọi môi trường. Các exception bị nuốt và trả None/[] khiến agent không phân biệt backend lỗi với bag không tồn tại hoặc danh sách rỗng. Có thể đưa ra chẩn đoán thiếu ngữ cảnh mà người dùng không biết nguồn dữ liệu đang lỗi.

**Sửa/kiểm chứng:** mặc định xác minh TLS, cấu hình CA cho môi trường cần thiết; phân biệt not-found, unauthorized, timeout và upstream failure; log có correlation ID. Test chứng chỉ không hợp lệ và backend timeout.

### R16 — Cập nhật cấu hình bằng sửa `.env` trực tiếp dễ sai và không nhất quán — P2

**Vị trí:** `src/config.py` (`load_dotenv(override=True)`, `update_env_setting`), `src/agents/retrieval/pipeline.py` (`get_rag_pipeline`), `src/services/backend_client.py` (`get_backend_client`).

Giá trị input được nối trực tiếp thành dòng `.env`, không loại newline/escape; read-modify-write không có khóa/atomic replace nên concurrent updates có thể ghi đè nhau. `.env` được ưu tiên hơn environment của tiến trình. Chỉ clear cache Settings, trong khi singleton RAG/backend client giữ settings cũ. Vì vậy API báo cập nhật thành công không đảm bảo mọi thành phần đã dùng cấu hình mới.

**Sửa/kiểm chứng:** lưu cấu hình có version bằng kho cấu hình phù hợp, secret chỉ ở server; validate input, cập nhật atomically và có cơ chế reload dependency hoặc restart rõ ràng. Test newline, backslash, hai cập nhật đồng thời và retrieval sau đổi config.

### R17 — RAG index không cập nhật khi corpus thay đổi — P2

**Vị trí:** `src/agents/retrieval/pipeline.py:79`, `.dockerignore`, `src/agents/ingestion/loaders.py`.

Chỉ cần collection có một document là `_ensure_index()` bỏ qua toàn bộ ingestion. Playbook mới/sửa/xóa không được đồng bộ; index dở dang cũng có thể bị coi như đã hoàn tất. Loader còn phụ thuộc fallback đường dẫn ổ D: của máy cá nhân. `.dockerignore` loại `*.md`; tài liệu Markdown ở root context bị loại, còn các thư mục knowledge lồng sâu cần kiểm chứng chính xác bằng image thay vì giả định corpus đã được đóng gói.

**Sửa/kiểm chứng:** cấu hình đường dẫn knowledge rõ ràng, quản lý manifest/version và upsert/delete theo source; readiness kiểm tra corpus cần thiết. Build image và kiểm kê playbook thực sự có trong container; test thêm/sửa/xóa tài liệu và khôi phục sau ingestion thất bại.

### R18 — Cấu hình AI trên giao diện chưa được backend áp dụng đầy đủ — P2

**Vị trí:** `WebAPI/FrontEnd(ReactJS)/src/service/chatService.js:75`, `:82`, `src/service/agentService.js` trong frontend; `src/models/schemas.py` (`ChatRequest`); `src/api/routes.py`.

Frontend gửi `temperature` và `system_prompt`, nhưng schema Python và state tạo ở route không nhận/chuyển tiếp hai field đó. Ngoài ra `runAgentDiagnosticApi` gọi hàm chat đang chọn `getEffectiveAiConfig('chat')`, nên cấu hình riêng cho diagnostic không được chọn ở luồng này.

**Sửa/kiểm chứng:** thống nhất API contract; server kiểm soát field nào được tùy chỉnh; truyền feature đúng và trả lại cấu hình hiệu lực khi thích hợp. Contract test phải xác nhận thay temperature/prompt/model thực sự tới model client, không chỉ lưu trên UI.

### R19 — Benchmark UI mô phỏng chạy/lưu và gán prediction bằng label — P1

**Vị trí:** `WebAPI/FrontEnd(ReactJS)/src/feature/benchmark/pages/Engineering/BenchmarkPage.jsx:46`, `:56`, `:101`.

Run evaluation chỉ dùng timeout 600 ms rồi thông báo thành công. Save dataset chỉ thông báo, không persist qua API. Case mới có `prediction: formData.label`, làm metric có thể tốt lên dù model chưa chạy. Đây là vấn đề độ tin cậy sản phẩm/đánh giá, không chỉ là code smell.

**Sửa/kiểm chứng:** nối evaluation job thật và lưu dataset ở server; prediction ban đầu là chưa đánh giá; chỉ tính metric trên case có prediction hợp lệ. Nếu giữ demo, hiển thị rõ và không đưa metric demo vào báo cáo thực nghiệm. Reload phải giữ dataset đã lưu; evaluation phải có run ID, model/corpus version và kết quả từng case.

### R20 — Cache frontend có race khi mutation diễn ra cùng GET — P2

**Vị trí:** `WebAPI/FrontEnd(ReactJS)/src/service/apiClient/apiClient.js:97`, `:124`.

Cache bị invalidated trước khi mutation hoàn tất. GET cũ đang bay vẫn có thể trả dữ liệu cũ rồi ghi lại cache sau mutation; GET mới cũng có thể deduplicate vào request cũ. UI có thể hiển thị trạng thái trước sửa trong thời gian TTL.

**Sửa/kiểm chứng:** invalidation sau thành công, kết hợp generation/version để response cũ không ghi vào cache mới hoặc dùng cơ chế query cache quản lý race. Test bằng deferred fetch: GET bắt đầu → mutation xong → GET cũ trả về; lần đọc tiếp theo phải nhận dữ liệu mới.

### R21 — Frontend chưa có test/lint gate bắt buộc; dependency build thiếu tính tái lập — P2

**Vị trí:** `WebAPI/FrontEnd(ReactJS)/package.json`, `.github/workflows/ci.yml`, `requirements.txt`.

Package scripts chỉ có dev/build/preview; CI dùng `npm test --if-present`, nên thiếu test script vẫn xanh. `npm install` không bắt buộc khớp lockfile như `npm ci`. Python dùng nhiều cận dưới `>=` mà chưa có lock resolution trong cấu hình đã xem. CI dùng toolchain có sẵn trên self-hosted runner, khiến kết quả phụ thuộc trạng thái máy.

**Sửa/kiểm chứng:** thêm test cho auth, upload/polling, cache và benchmark; lint frontend; dùng install theo lock và pin toolchain. Python tách dependencies runtime/dev và lock phiên bản đã kiểm chứng. Fresh checkout trên runner sạch phải cho kết quả lặp lại. Không suy ra dependency có CVE chỉ từ version hiện tại.

### R22 — Pipeline auto-merge rộng hơn mức kiểm chứng hiện có — P2

**Vị trí:** `.github/workflows/ci.yml` (`permissions`, self-hosted runner, bước 4.1).

Workflow PR có quyền ghi và tự gọi merge sau build/test. Với R08/R21, các check xanh chưa đảm bảo regression chính đã chạy. Mã PR được thực thi trên runner dùng chung; mức rủi ro phụ thuộc ai được gửi PR, cơ chế duyệt workflow và cấu hình runner/repository chưa được kiểm tra trong phiên này.

**Sửa/kiểm chứng:** job kiểm thử dùng quyền đọc tối thiểu; tách merge thành workflow có điều kiện/approval theo quy trình nhóm; rà soát branch protection và cách ly runner khi nhận mã không tin cậy. Đây là đề nghị kiểm tra cấu hình vận hành, không khẳng định branch protection hiện đang bị bỏ qua.

## 6. Kiến trúc và khả năng bảo trì

### R23 — Domain phụ thuộc MongoDB và dùng document persistence làm model xuyên tầng — P2

**Vị trí:** `WebAPI/BackEnd(ASP.Net)/Domain/Domain.csproj`, `Domain/Entities/NoSql/ReportSnapshotDocument.cs`, `Domain/Entities/NoSql/FindingEvidenceDocument.cs`, `Application/Features/Reports/Queries/ReportQueries.cs`.

Domain reference `MongoDB.Bson`, chứa `[BsonElement]`, `BsonDocument` và chi tiết serialization. Application trực tiếp tạo snapshot document và trả snapshot qua DTO. Điều này làm thay đổi storage kéo theo thay đổi tầng nghiệp vụ/API.

**Đề xuất:** chuyển Mongo document/mapping sang Infrastructure, dùng model/DTO độc lập ở contract. Ưu tiên những model đang thay đổi nhiều; không cần thêm interface/layer chỉ để đạt hình thức Clean Architecture.

### R24 — Một số nhánh che giấu chức năng chưa hoàn chỉnh hoặc sai danh tính audit — P2

**Vị trí:** `Infrastructure/Services/Storage/CloudinaryStorageService.cs:13`; `Application/Features/Reviews/Commands/SubmitReviewCommand.cs`; `Application/Features/Sessions/Commands/StartAnalysisCommand.cs`; `Application/Features/Reports/Queries/ReportQueries.cs` trong backend.

Storage service được đăng ký trong DI nhưng upload chỉ trả fileName và delete không làm gì. Các handler review/session/report có fallback sang user đầu tiên có RoleId khi không xác định được người thao tác; review còn có ID mặc định. Nếu các nhánh này được gọi, hệ thống có thể báo thành công giả hoặc gán audit cho người khác. Chưa khẳng định mọi endpoint hiện có đều gọi storage stub.

**Đề xuất:** hoàn thiện adapter hoặc fail rõ ràng khi chức năng chưa hỗ trợ; không trả thành công giả. Actor không hợp lệ phải bị từ chối, hoặc dùng system identity được định nghĩa rõ cho tác vụ nền. Thêm test contract cho storage và audit actor.

### R25 — Cần dọn cảnh báo và giảm tải dữ liệu không cần thiết — P2

**Bằng chứng build:** 17 warning, gồm 11 chỗ dùng `BaseEntity` obsolete, hai warning tên migration và bốn warning nullable. Các vị trí nullable: `Application/Features/User/User/UsermanageDTO.cs:10`, `Application/Features/Admin/ManageUser/ReadDataUser/QueriesAdminReadDataUser/GetAdminProfileQueryHandler.cs:26`, `Infrastructure/Persistence/Mongo/Repositories/ReportSnapshotRepository.cs:38`, `Infrastructure/Services/Logging/UserActivityLogBackgroundService.cs:184`.

**Bằng chứng query:** `Application/Features/Reports/Queries/ReportQueries.cs` lấy mọi issue trong `GetReportByIdQueryHandler`, rồi đếm theo session trong memory; danh sách reports lấy toàn bộ trước khi sort.

**Đề xuất:** xử lý nullable theo ý nghĩa nghiệp vụ, chuyển base entity về namespace chuẩn, không dùng null-forgiving chỉ để hết warning. Đẩy filter/count/order/pagination xuống DB. Warning tự nó chưa chứng minh sẽ có crash; nên thêm test cho trường hợp thiếu dữ liệu tương ứng. Không đổi migration đã triển khai chỉ vì cảnh báo tên.

### R26 — Tài liệu kiến trúc lỗi thời và có chi tiết từ project cũ — P3

**Vị trí:** `WebAPI/Structure.md:4`, `:74`, `:243`, `:262`.

Tài liệu dùng `Source-Code/...` thay vì `WebAPI/...`, nhắc module Clubs/Ticket/EventWaitlist và mô tả Program là WeatherForecast template. Program thực tế đã có controllers, authentication, authorization, DI và middleware. Hướng dẫn này dễ khiến người mới thêm lại cấu hình đã có hoặc hiểu sai phạm vi nghiệp vụ.

**Đề xuất:** viết lại sơ đồ ba dịch vụ, đường đi request AI/inspection, SQL–Mongo–Redis, cấu hình cần thiết và phân biệt chức năng thực với demo. Cập nhật lệnh chạy test không phụ thuộc đường dẫn máy cá nhân; checklist PR yêu cầu cập nhật tài liệu khi đổi API/kiến trúc.

## 7. Điểm tốt nên giữ

- Application tham chiếu Domain; Infrastructure triển khai interface của Application. Không thấy lý do phải thay toàn bộ cấu trúc bốn project đang có.
- Có policy tài khoản, BCrypt password hasher, JWT validation và kiểm tra trạng thái user khi token được xác thực.
- Backend có giới hạn request, rate limit cho auth, cấu hình CORS production và middleware xử lý lỗi.
- Pipeline inspection đã tách các analyzer theo loại lỗi, có abstraction cho job và repository.
- Python đã đưa một số tác vụ I/O đồng bộ sang threadpool; có test riêng cho schema báo cáo, chunking, embedding, ingestion và vector store.
- Frontend có lazy loading, API client tập trung và cache phân biệt theo token.
- Có regression chú trọng registration/approval/delete user và kiểm tra hành vi EF; cần sửa setup và tích hợp CI để phát huy giá trị.

## 8. Kế hoạch cải thiện đề xuất

| Giai đoạn | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1. Bảo vệ dữ liệu | R01–R03, R06; xác định ma trận quyền và corpus được phép | Anonymous không sửa config/đọc tài nguyên riêng; không inspect ngoài storage; RAG không lấy dữ liệu ngoài quyền |
| 2. Bảo đảm kết quả thật | R04–R05, R19, R24 | Không còn kết quả hardcode hoặc toast thành công giả trong luồng thực; report có nguồn findings/reviews xác định |
| 3. Khôi phục kiểm chứng | R08, R21–R22; sửa môi trường Python | CI thực sự chạy regression, Python tests và frontend tests; fail khi test bắt buộc không chạy |
| 4. Chạy ổn định | R07, R09–R13, R15–R17 | Container smoke test pass; upload đúng limit; worker có giới hạn tài nguyên; cấu hình/index cập nhật nhất quán |
| 5. Cải thiện UX và bảo trì | R14, R18, R20, R23, R25–R26 | Contract test pass, cache không trả dữ liệu cũ sau mutation, giảm warning và tài liệu khớp mã |

Ưu tiên kiểm thử theo hành vi: quyền truy cập chéo user/workspace; dữ liệu clean/fault; Mongo lỗi sau SQL commit; job cancellation/restart; upload lớn; stale cache; cấu hình model thực sự được áp dụng. Các test nên xác nhận kết quả quan sát được, không chỉ lặp lại implementation.

## 9. Các điểm cần xác nhận ở môi trường triển khai

- Python API có đứng sau gateway xác thực và firewall không? Điều này thay đổi mức phơi lộ của R01, nhưng không thay thế việc ràng buộc quyền trong ứng dụng.
- Bag/session được chia sẻ toàn hệ thống hay theo workspace/owner? Dùng câu trả lời để hoàn thiện R02.
- Những collection nào thực sự có trong Mongo và bộ nào dùng làm benchmark holdout? Chưa đọc dữ liệu production.
- Reverse proxy có override body limit, cấu hình TLS/forwarded headers và route health không? Chưa kiểm chứng deployment thật.
- Những màn analysis/report/benchmark nào đang được coi là demo? Nếu chưa triển khai thực, cần nhãn rõ thay vì để người dùng hiểu là kết quả đo.

Báo cáo này cung cấp backlog sửa lỗi có bằng chứng; các bước kiểm chứng sau sửa là đề xuất, không phải các test đã chạy thành công trong phiên rà soát.
