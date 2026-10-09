# Kiểm thử đăng ký User / duyệt Engineer / xóa thành viên

Chạy từ thư mục gốc repository:

```powershell
dotnet restore "tests/RegistrationApproval/RegistrationApproval.csproj"
dotnet run --project "tests/RegistrationApproval/RegistrationApproval.csproj" --no-restore -p:OutputPath="D:/CTRL SHIFT N/P-137/tests/RegistrationApproval/bin/regression/"
```

Bộ kiểm thử dùng controller, handler, BCrypt và xác thực JWT thực của project, nhưng thay repository bằng bộ nhớ và thay thông báo/log bằng dịch vụ giả. Không đọc appsettings của project; không truy cập SQL, MongoDB, Redis hay tài khoản thật. Không gọi Google OAuth thật.

`RegistrationEfRegression.cs` bổ sung kiểm thử đăng ký email/mật khẩu bằng handler, model EF và repository tạo User/Role thật. Kiểm tra cả User/Engineer, Role có sẵn/Role chưa có: Role đã tồn tại không được đánh dấu `Added`, khóa ngoại phải đúng, User vẫn nhận JWT ngay và Engineer vẫn chờ duyệt. Truy vấn và lưu dữ liệu được giả lập; không kết nối hoặc ghi database thật. Kiểm thử này bắt được lỗi mà repository thuần bộ nhớ không phát hiện.

Dịch vụ Notification trong kiểm thử cố ý ném lỗi như khi model EF chưa có `Notification`. API duyệt Engineer phải trả thành công mà không gọi dịch vụ này (kể cả duyệt lặp), nhưng vẫn ghi audit người duyệt và tài khoản được duyệt. Đăng nhập đúng mật khẩu khi chờ duyệt phải trả mã `ENGINEER_PENDING_APPROVAL` cùng thông báo chờ Admin duyệt, không cấp JWT; mật khẩu sai vẫn bị từ chối bằng lỗi thông tin đăng nhập.

Tham số `-- --serve` giữ server kiểm thử trên một cổng loopback ngẫu nhiên để kiểm thử giao diện. Đây không phải cấu hình chạy production.

Kiểm thử xóa thành viên xác nhận DELETE chỉ dành cho Admin, không tự xóa; xóa mềm giữ bản ghi và audit, danh sách tải lại không chứa tài khoản đã xóa. Tài khoản đã xóa không đăng nhập được và JWT cũ bị từ chối; duyệt Engineer/đổi vai trò không thể khôi phục tài khoản đã xóa. Quyền Admin được kiểm tra lại từ repository để không chấp nhận JWT Admin sau khi tài khoản đã bị hạ quyền.

`MemberDeletionEfRegression.cs` sử dụng model và repository EF thật để xác nhận chỉ có UPDATE, không DELETE hay INSERT Role. Save thất bại phải truyền lỗi lên API, không trả thành công. Các phép lưu vẫn được giả lập, không ghi database thật.

Dùng thư mục output `bin/` như trên (đã được Git ignore). .NET có thể sao chép file cấu hình vào output khi build; không commit hoặc chia sẻ thư mục build này.
