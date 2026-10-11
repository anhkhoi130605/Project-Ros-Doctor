# User gửi rosbag, Engineer/Admin duyệt trực tiếp trên rosbags

## Phạm vi

Không dùng bảng `rosbag_submissions`. Một file được gửi tạo đúng một bản ghi trong `rosbags`;
quyết định duyệt cập nhật bản ghi đó. Mã định danh trả về API là RosbagId.

Năm cột bổ sung:

- `review_status`: varchar(20), enum Draft / Submitted / Approved / Rejected.
- `description`: varchar(2000), nullable.
- `reviewer_id`: varchar(36), nullable, khóa ngoại Users.Id, ON DELETE SET NULL.
- `review_note`: varchar(2000), nullable.
- `reviewed_at`: datetime(6), nullable.

Giữ nguyên `status` cho trạng thái xử lý Ready / Processing / Complete / Invalid.
Giá trị mặc định review_status = Approved để các rosbag cũ không phải duyệt lại.
Endpoint gửi file luôn gán Submitted từ backend. Draft được khai báo để phân biệt trạng thái;
phiên bản này chưa có chức năng lưu nháp hoặc sửa/gửi lại một quyết định đã hoàn tất.

## Cập nhật database — chưa thực hiện trên database thật

### Tự bổ sung khi chạy backend Development

`Program.cs` gọi `RosbagReviewSchemaInitializer` trước khi nhận HTTP request, chỉ ở môi trường
Development và không chạy khi EF tooling đang ở design-time. Các profile `dotnet run` hiện tại
đã đặt Development. MySQL phải đang chạy và tài khoản cần quyền ALTER/INDEX/REFERENCES.

- Sao lưu database trước lần khởi động đầu tiên và kiểm tra đúng connection string.
- Kiểm tra metadata rồi chỉ thêm các cột, chỉ mục, khóa ngoại còn thiếu; không tạo bảng mới.
- Lần chạy sau không thực hiện DDL nếu cấu trúc đã đủ. Có khóa MySQL theo schema để tránh
  hai backend khởi động cùng lúc tự thêm trùng cột.
- Nếu một lần trước thất bại giữa chừng, lần sau kiểm tra lại phần đã tồn tại và chỉ tiếp tục phần thiếu.
- Nếu cột/chỉ mục/khóa ngoại đã có nhưng không tương thích, dừng startup và báo lỗi, không tự sửa/xóa dữ liệu.
- Không gọi EnsureCreated/Migrate, không chạy SQL script nguyên khối và không tự ghi __EFMigrationsHistory.
- Log thành công: `Rosbag review schema ready. Applied ... additive statements`.
- Tắt tự khởi tạo bằng cấu hình `RosbagReview:InitializeSchemaOnStartup = false`
  (biến môi trường PowerShell: `$env:RosbagReview__InitializeSchemaOnStartup = "false"`).
- Production luôn bỏ qua khởi tạo này; phải cập nhật schema có kiểm soát trước triển khai.

Sau khi startup đã bổ sung schema, **không chạy nguyên script SQL/migration này lần nữa**.
Cần đối chiếu schema và baseline migration history riêng trước khi sử dụng EF migrations cho database đó.
Chưa thực thi bộ khởi tạo trên database thật trong quá trình phát triển/kiểm thử này.

### Phương án SQL thủ công thay thế (không dùng cùng lúc với khởi tạo tự động)

Đã chuẩn bị migration `20261011000000_AddRosbagReview`, designer, snapshot và SQL sinh
riêng từ migration này tại `scripts/sql/20261011_rosbag_review.sql`.

**Không chạy script tạo bảng rosbag_submissions cũ.** Model và script cũ đã bỏ.
Nếu bạn đã tạo bảng đó và có dữ liệu, không xóa bảng: bản này không đọc hoặc tự chuyển dữ liệu
từ bảng cũ. Cần lên phương án chuyển riêng trước khi đổi bản đang chạy.

1. Sao lưu database, kiểm tra đúng schema backend sử dụng.
2. Kiểm tra bảng rosbags, Users, kiểu/collation Users.Id và lịch sử __EFMigrationsHistory.
3. Kiểm tra chưa có năm cột và migration mới chưa được áp dụng.
4. Chạy script SQL mới đã duyệt, sau đó khởi động lại backend.
5. Nếu lỗi ở giữa, kiểm tra cột/chỉ mục/khóa ngoại đã tạo trước khi tiếp tục:
   DDL MySQL không được rollback toàn bộ chỉ vì script có START TRANSACTION.

Script chỉ ALTER rosbags, thêm hai chỉ mục và một khóa ngoại; không xóa bảng/cột cũ,
không tạo bảng trung gian. Script ghi migration vào __EFMigrationsHistory nên bảng lịch sử
phải tồn tại và đã được đối chiếu. Không đánh dấu các migration cũ là đã chạy khi chưa kiểm tra.

**Lưu ý lịch sử dự án:** snapshot cũ vẫn có các khác biệt có trước thay đổi này
(ví dụ namespace AboutUser so với Identity, RowVersion và một số chỉ mục).
Snapshot/designer mới chỉ cập nhật phần review của Rosbag, không tự hợp thức hóa các khác biệt đó.
Vì vậy không chạy mù `dotnet ef database update` hoặc tự động Migrate ở startup.
Cần đối chiếu/baseline lịch sử cũ trước khi tiếp tục quản lý toàn bộ schema bằng EF CLI.
Không bỏ qua cảnh báo PendingModelChanges chỉ để ép cập nhật database.

## API

- `POST /api/bags/submissions`: multipart file + description; chủ sở hữu lấy từ JWT.
- `GET /api/bags/submissions`: User thấy lượt gửi của mình; Engineering/Admin thấy hàng đợi
  chung và lịch sử đã duyệt. Rosbag cũ Approved nhưng chưa có reviewed_at không vào lịch sử gửi.
- `GET /api/bags/pending-review`: chỉ Engineering/Admin, chỉ Submitted.
- `POST /api/bags/{id}/review`: chỉ Engineering/Admin; { approve, reason }.
  Chỉ Submitted được duyệt, từ chối cần lý do, cập nhật có điều kiện chống ghi đè khi hai người duyệt.
- Endpoint cũ `/api/bag-submissions` không còn được sử dụng. Route giao diện
  `/#/bag-submissions` vẫn giữ để không làm hỏng điều hướng.

## File và phân tích

- Nhận .db3 hoặc ZIP chứa đúng một .db3, tối đa 512 MB trước/sau giải nén.
- Kiểm tra cấu trúc SQLite topics/messages; không gọi AI, không tạo session khi gửi hoặc duyệt.
  Đây không phải quét mã độc hoặc kiểm định toàn bộ payload CDR; chưa hỗ trợ MCAP/multi-part ZIP.
- File lưu riêng ngoài wwwroot tại API/App_Data/rosbag-submissions; vị trí lưu trong storage_url.
  Tên gốc vẫn trong file_name, format SQLite3 và size_bytes phản ánh file db3 được lưu sau giải nén.
  Có thể cấu hình RosbagSubmissions:StoragePath; sao lưu cả thư mục và database.
- Chỉ Approved xuất hiện trong danh sách/detail rosbag cho luồng phân tích và bộ đếm dashboard.
  User vẫn theo dõi Submitted/Rejected qua danh sách gửi duyệt.
- StartAnalysis kiểm tra Approved trước khi tạo session. Inspect theo đường dẫn file đã lưu
  cũng kiểm tra duyệt trước khi đọc; khi được duyệt, tái sử dụng RosbagId, không tạo bản ghi bag thứ hai.
- Các endpoint upload phân tích trực tiếp, inspect, tạo bag trực tiếp, start session chỉ cho
  Engineering/Admin; User không thể đi vòng qua quy trình duyệt bằng API cũ.
- Không tự chạy phân tích sau Approved. Luồng báo cáo cũ không thay đổi.
- File bị từ chối được giữ để truy vết; chưa bổ sung quota, retention, xóa file tự động.
- Bộ StartAnalysis cũ có dữ liệu kết quả mẫu; thay đổi này chỉ thêm kiểm tra trạng thái,
  không thay thuật toán phân tích cũ.

## Kiểm thử

Từ thư mục gốc:

```powershell
dotnet run --project tests/RosbagSubmissions/RosbagSubmissions.csproj
```

Kiểm thử enum/policy, EF model, migration chỉ thêm 5 cột, SQL sinh offline, validator SQLite thực
với file tạm, routing/authorization thực với service double. Không kết nối MySQL/MongoDB hay gọi AI.
Kiểm thử kế hoạch startup gồm schema trống/đủ/một phần, khởi động lại, chỉ mục tương đương,
khóa ngoại không an toàn và cột có cấu trúc khác dự kiến; chưa kiểm thử GET_LOCK/DDL trên MySQL thật.

Sau khi cập nhật database kiểm thử cần kiểm tra:

1. Rosbag cũ vẫn Approved và sử dụng bình thường; Draft không bị default thành Approved.
2. User gửi file → một dòng rosbags Submitted, đúng user_id; không có session/report mới.
3. Restart backend → vẫn thấy file; hai User không xem lượt gửi của nhau.
4. Hai Engineer duyệt cùng lúc: một thành công, bên còn lại 409.
5. Từ chối không có lý do 400, User duyệt 403, quyết định đã hoàn tất không duyệt lại.
6. Submitted/Rejected/Draft không vào danh sách phân tích và bị chặn khi gọi start/inspect trực tiếp.
7. Approved vào danh sách; inspect file đó không tăng số dòng rosbags, session tham chiếu đúng Id.
8. Xóa người duyệt không xóa rosbag; ghi chú/ngày duyệt giữ nguyên.
9. Kiểm tra các luồng phân tích/báo cáo cũ cho Engineering/Admin.

Kiểm thử giả lập không thay thế kiểm thử tích hợp MySQL và concurrency thực tế.
