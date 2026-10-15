# Ground truth Việt / Anh

## Lưu trữ và tương thích

Không tạo collection mới. Mỗi phần tử `benchmark_datasets.test_cases` hỗ trợ:

- `ground_truth`: chuỗi cũ, giữ nguyên.
- `case_id`: định danh tùy chọn; không có thì dùng `code`. Định danh duy nhất trong bộ.
- `ground_truth_detail`: BSON object, không phải chuỗi JSON. Có `schema_version: 1`,
  `has_fault`, `fault_type`, các thông số/kịch bản gốc và `i18n.vi`, `i18n.en`.

HTTP .NET dùng `caseId`, `groundTruthDetail`; bên trong detail giữ snake_case như
file nguồn. API đọc benchmark Python giữ snake_case. Document cũ không cần migration.
Chi tiết hỗ trợ `sub_faults`, `phases`, các cửa sổ và thông số khác nhau giữa các case.
Server kiểm tra cấu trúc cơ bản, ngôn ngữ, số hữu hạn, độ sâu, kích thước và khóa không hợp lệ;
không coi validation cấu trúc là bằng chứng đáp án đúng về mặt chuyên môn.

## Nhập hai file và duyệt

1. Khởi động lại backend .NET và frontend với code mới.
2. Mở trang quản lý Benchmark → mở bộ hiện có → **Gửi đề xuất mới** (hoặc tạo bộ mới).
3. Chọn `ground_truth_vi.json` và `ground_truth_en.json` trong **Nhập ground truth Việt / Anh**.
4. Bấm **Nhập vào đề xuất**. Chỉ thay đổi bản nháp trên trình duyệt, chưa ghi database.
5. Kiểm tra ánh xạ case, tên rosbag, topic và khoảng thời gian. Case mới thiếu `end_sec`
   tạm dùng start ở ô thời gian legacy; phải điều chỉnh nếu biết thời điểm kết thúc.
   Object ground truth không tự thêm `end_sec` hay bịa thời lượng.
6. Gửi Admin duyệt. Dữ liệu lưu ở `change_request.proposed_data.test_cases` trước;
   chỉ khi duyệt mới cập nhật `test_cases` chính thức và tăng version bằng luồng hiện có.

Importer yêu cầu cùng case IDs và thông số giữa hai file. Phần văn bản diễn giải được
tách theo ngôn ngữ; số đo không tự dịch/đổi dấu. Ghép theo case_id, code hoặc tên file
không có đuôi .db3/.mcap/.bag. Nếu nhiều hàng cùng khớp, dừng để người dùng xử lý;
không tự gộp/xóa hàng. Những case không có trong file nhập vẫn giữ nguyên.
Nhập lại cùng cặp file là thao tác cập nhật bản nháp, không tạo hàng trùng.

## Ranh giới RAG / đáp án

Pipeline chatbot chỉ lập chỉ mục MongoDB từ `findings_evidence`,
`topic_metrics_timeseries`, `session_tf_trees`, `report_snapshots`, cùng playbook.
Không lấy benchmark, kết quả đánh giá hoặc câu trả lời agent cũ làm bằng chứng.
Bộ lọc truy vấn cũng loại các chunk đáp án đã tồn tại trong Chroma cũ, không cần xóa
database/chỉ mục. Khởi động lại Python để bộ lọc mới có hiệu lực.
`MongoDatasetLoader` riêng vẫn là tiện ích đọc benchmark; không nối loader này vào
pipeline chẩn đoán. API quản lý/đọc benchmark vẫn có thể trả ground truth cho giao diện.

Giới hạn: đây là tích hợp lưu trữ, nhập, duyệt và ngăn truy xuất trực tiếp đáp án.
Chưa thêm bộ chấm chẩn đoán, kiểm chứng evidence IDs hay lọc dữ liệu theo session/user.
Allowlist collection không bảo đảm nội dung các collection được phép chưa từng bị nhiễm đáp án.
Tài liệu học thuật trong file nguồn được giữ để người duyệt xác minh, không tự xác nhận hợp lệ.
Không có script tự ghi MongoDB khi chạy `dotnet run`.

## Tra cứu trong Chat Agent

Đã có luồng tra cứu riêng, không dùng LLM để suy đoán/viết lại đáp án:

> Tra cứu ground truth tiếng Việt của case_11_outlier_accel_spike trong BENCHMARK-25-GOLDEN

> Show ground truth for case_11_outlier_accel_spike in BENCHMARK-25-GOLDEN in English

Có thể chọn rosbag rồi hỏi tự nhiên, không cần gõ mã case hay `ground truth`:

> Bằng chứng của lỗi này là gì?

> Cho tôi xem bằng chứng cần kiểm tra.

> Lỗi này có nguồn trích dẫn nào?

> What evidence should I check for this fault?

Router nhận diện yêu cầu bằng chứng/nguồn trích dẫn và gọi hàm tra cứu MongoDB trực tiếp;
đây là định tuyến tool bằng quy tắc, không phải LLM tự quyết định function calling.
Case được lấy từ tên file rosbag đang chọn (đúng dạng `case_XX_...db3/.mcap/.bag`),
hoặc từ rosbag của session đang chọn. Mã case viết rõ trong câu hỏi được ưu tiên.
Không đoán case từ rosbag mới nhất, tên gần giống hoặc nhiều case/dataset trong cùng câu hỏi.
Nếu không xác định được case hoặc session/rosbag không khớp, yêu cầu người dùng chọn lại/cung cấp mã.
Tên file khớp benchmark chỉ là khóa tra cứu, không chứng minh rosbag có lỗi tương ứng.

Câu trả lời mặc định rút gọn: loại lỗi/topic, tối đa 3 mục bằng chứng cần kiểm tra,
một dòng mốc đối chiếu (tối đa 6 trường ngắn), nguồn dataset/version và URL tham khảo nếu có.
Không đổ JSON, cơ chế tiêm lỗi, nguyên nhân giả thuyết hay toàn bộ playbook vào chat.
`ground_truth_detail` và metadata nguồn trong API vẫn đầy đủ, không sửa dữ liệu lưu trong MongoDB.
Câu hỏi chẩn đoán thông thường hoặc yêu cầu bằng chứng **thực tế/đã đo/telemetry** vẫn đi qua
telemetry + RAG, không được thay bằng đáp án benchmark. Câu hỏi định nghĩa “Bằng chứng là gì?”
không kích hoạt tra cứu.
Nếu không nêu dataset, chỉ trả kết quả khi có đúng một case có ground truth có cấu trúc
đã công bố; nếu có nhiều kết quả, yêu cầu chọn bộ. Không đọc `change_request.proposed_data`.
Hiện bộ nhận diện câu hỏi hỗ trợ mã dạng `case_11_outlier_accel_spike`; API trực tiếp
hỗ trợ mã chữ/số/gạch ngang/gạch dưới dài tối đa 100 ký tự.

Chat vẫn qua guardrails đầu vào, ngữ cảnh và đầu ra. Nếu kiểm tra an toàn không khả dụng,
chat có thể từ chối dù DB có dữ liệu; không tắt guardrails để che lỗi này.
Kết quả hiển thị nguồn MongoDB, dataset/version/case; nhấn mạnh bằng chứng trong đáp án
là yêu cầu cần kiểm tra, không đánh dấu đã xác nhận lỗi trên phiên đang chọn.
Academic references được trả đúng theo file nguồn, chưa xác minh độc lập tính chính xác.
Không tạo diagnostic report từ đáp án. Trace chat mang nhãn `lookup` và nguồn thực tế.

API chỉ đọc, không gọi LLM, không ghi DB:

```text
GET /api/v1/benchmarks/BENCHMARK-25-GOLDEN/cases/case_11_outlier_accel_spike/ground-truth?language=vi
```

Trả `ground_truth_detail`, `response`, `source` (document ID, phiên bản, đường dẫn trường,
ngôn ngữ, SHA-256 nội dung). 404: không có đáp án đã công bố; 409: trùng;
422: định dạng/ngôn ngữ không hợp lệ; 503: không đọc được kho dữ liệu.
Endpoint này tuân theo phạm vi đọc benchmark đã công bố của API Python hiện có;
không bổ sung cơ chế xác thực mới trong thay đổi này.

## Nhập trực tiếp có kiểm soát (maintenance)

Luồng thông thường vẫn là Engineer đề xuất → Admin duyệt. Khi có yêu cầu nhập trực tiếp
được cho phép, có thể dùng script bên dưới. Không tạo collection/dataset, không ghi đè
trường legacy, không giả tạo quyết định Admin, không chạy nếu có yêu cầu đang Pending.
Script dùng chung bộ chuẩn hóa/kiểm tra cặp file của frontend, cần Node.js và Python venv.

```powershell
.\.venv\Scripts\python.exe -m scripts.import_ground_truth_pair --vi "C:\Users\DatDuong\Downloads\ground_truth_vi.json" --en "C:\Users\DatDuong\Downloads\ground_truth_en.json" --dataset BENCHMARK-25-GOLDEN
```

Lệnh trên chỉ dry-run. Muốn ghi phải thêm `--apply --expected-version N`, với N là phiên bản
đã kiểm tra. Trước ghi, script sao lưu toàn bộ document vào `tmp/ground-truth-backups/`.
Ghi một document nguyên tử, kiểm tra phiên bản, test_cases và change_request chưa thay đổi;
tăng version, ghi metadata nguồn/timestamp/SHA-256 vào `ground_truth_import`.
Nhập lại cùng nội dung không tăng phiên bản. Không sửa 4 bộ benchmark còn lại.

Đã thực hiện nhập theo yêu cầu: `CtrlShiftN.benchmark_datasets`, bộ `BENCHMARK-25-GOLDEN`,
25 case có cả vi/en, phiên bản **1 → 2**. Backup trước nhập:
`tmp/ground-truth-backups/benchmark-before-u7y6wruj.json` (gitignored; giữ bản này nếu cần phục hồi).
Không tự restore đè lên dữ liệu mới hơn; trước phục hồi phải kiểm tra version và sao lưu lại.
Khởi động lại Python để chat và endpoint tra cứu mới có hiệu lực.

## Kiểm thử không dùng database thật

```powershell
dotnet run --project tests/BenchmarkReview/BenchmarkReview.csproj
node --test "WebAPI/FrontEnd(ReactJS)/tests/benchmark-ground-truth.test.cjs" "WebAPI/FrontEnd(ReactJS)/tests/benchmark-review.test.cjs"
.\.venv\Scripts\python.exe -m pytest tests/test_services/test_benchmark_ground_truth.py -q
```
