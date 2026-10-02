# CTRL SHIFT N — ROS2 Doctor WebAPI

Ứng dụng hỗ trợ nạp ROS bag, phân tích dữ liệu ROS2, theo dõi phiên chẩn đoán, duyệt kết luận và tạo báo cáo.

Tài liệu này dành cho người phát triển trên Windows, macOS và Linux. Trừ khi có ghi chú khác, tất cả lệnh đều được chạy từ thư mục `WebAPI`.

## Trạng thái hiện tại

Project gồm backend ASP.NET Core và frontend React/Vite. Một số phần vẫn ở trạng thái prototype:

- Redis hiện cần thiết cho Dashboard và các luồng Session/Analysis vì các handler đang phụ thuộc trực tiếp vào `IRedisService`.
- MongoDB được dùng cho bằng chứng, TF tree, timeseries và snapshot báo cáo.
- `CloudinaryStorageService` hiện là stub; cấu hình Cloudinary chưa tạo ra chức năng upload cloud thực tế.
- Dữ liệu rosbag mẫu không được đóng gói sẵn trong repository. Muốn dùng `/api/bags/samples`, cần cấu hình thư mục chứa file `.db3`.
- Frontend có luồng đăng nhập demo phục vụ preview. Cần rà soát lại authentication/authorization trước khi triển khai production.
- Frontend đang gửi quyết định `changes`, trong khi enum backend dùng `ChangesNeeded`. Cho đến khi contract này được đồng bộ, không dùng luồng “yêu cầu thay đổi” cho dữ liệu thật.

## Cấu trúc thư mục

```text
WebAPI/
├── BackEnd(ASP.Net)/
│   ├── API/                 # ASP.NET Core Web API
│   ├── Application/         # Use cases, DTOs, commands và queries
│   ├── Domain/              # Entities và enums
│   └── Infrastructure/      # Database, auth, Redis, MongoDB, email và storage
├── FrontEnd(ReactJS)/       # React 18 + Vite 5
└── AI-Agent-Skill/          # Tài nguyên liên quan AI agent
```

## Yêu cầu hệ thống

### Bắt buộc

- .NET SDK 10.0.
- Node.js 18 trở lên và npm.
- MySQL 8.x hoặc TiDB tương thích MySQL.
- Redis cho đầy đủ chức năng Dashboard và Session/Analysis.
- MongoDB cho các chức năng NoSQL của Session, Analysis và Report.

### Tùy theo chức năng

- SMTP cho quên mật khẩu và OTP.
- Google OAuth cho đăng nhập/đăng ký bằng Google.
- Chứng chỉ HTTPS development nếu chạy backend qua HTTPS.
- `dotnet-ef` 9.x nếu cần áp dụng hoặc tạo migration.

Kiểm tra công cụ:

```text
dotnet --version
node --version
npm --version
dotnet ef --version
```

Nếu chưa có EF CLI:

```text
dotnet tool install --global dotnet-ef --version 9.0.0
```

Nếu máy đã cài một phiên bản khác:

```text
dotnet tool update --global dotnet-ef --version 9.0.0
```

## Thiết lập nhanh

### 1. Khôi phục dependency

Từ thư mục `WebAPI`:

```text
dotnet restore "./BackEnd(ASP.Net)/API/API.csproj"
npm install --prefix "./FrontEnd(ReactJS)"
```

### 2. Cấu hình backend bằng User Secrets

Project API đã có `UserSecretsId`. Không lưu credential thật trong `appsettings*.json`, `.env` hoặc Git.

Đặt biến dùng chung để các lệnh ngắn hơn.

PowerShell:

```powershell
$apiProject = ".\BackEnd(ASP.Net)\API\API.csproj"
```

Bash/zsh:

```bash
api_project='./BackEnd(ASP.Net)/API/API.csproj'
```

#### Cấu hình cốt lõi

PowerShell:

```powershell
dotnet user-secrets set --project $apiProject "ConnectionStrings:DefaultConnection" "Server=<HOST>;Port=4000;Database=<DATABASE>;User=<USER>;Password=<PASSWORD>;SslMode=Required;"
dotnet user-secrets set --project $apiProject "Jwt:Issuer" "https://localhost:7149"
dotnet user-secrets set --project $apiProject "Jwt:Audience" "https://localhost:7149"
dotnet user-secrets set --project $apiProject "Jwt:Key" "<LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS>"
dotnet user-secrets set --project $apiProject "Jwt:ExpiresMinutes" "60"
dotnet user-secrets set --project $apiProject "Redis:Configuration" "localhost:6379"
dotnet user-secrets set --project $apiProject "Redis:InstanceName" "CtrlShiftN:"
dotnet user-secrets set --project $apiProject "MongoDbSettings:ConnectionString" "mongodb://localhost:27017"
dotnet user-secrets set --project $apiProject "MongoDbSettings:DatabaseName" "ctrl_shift_n"
```

Bash/zsh:

```bash
dotnet user-secrets set --project "$api_project" 'ConnectionStrings:DefaultConnection' 'Server=<HOST>;Port=4000;Database=<DATABASE>;User=<USER>;Password=<PASSWORD>;SslMode=Required;'
dotnet user-secrets set --project "$api_project" 'Jwt:Issuer' 'https://localhost:7149'
dotnet user-secrets set --project "$api_project" 'Jwt:Audience' 'https://localhost:7149'
dotnet user-secrets set --project "$api_project" 'Jwt:Key' '<LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS>'
dotnet user-secrets set --project "$api_project" 'Jwt:ExpiresMinutes' '60'
dotnet user-secrets set --project "$api_project" 'Redis:Configuration' 'localhost:6379'
dotnet user-secrets set --project "$api_project" 'Redis:InstanceName' 'CtrlShiftN:'
dotnet user-secrets set --project "$api_project" 'MongoDbSettings:ConnectionString' 'mongodb://localhost:27017'
dotnet user-secrets set --project "$api_project" 'MongoDbSettings:DatabaseName' 'ctrl_shift_n'
```

Thay các giá trị mẫu bằng thông tin của môi trường. Không dùng secret trong tài liệu này cho production.

#### Google OAuth — tùy chọn

Frontend mặc định chạy bằng HTTP, vì vậy `Frontend:BaseUrl` nên khớp chính xác với URL thực tế:

PowerShell:

```powershell
dotnet user-secrets set --project $apiProject "Authentication:Google:ClientId" "<GOOGLE_CLIENT_ID>"
dotnet user-secrets set --project $apiProject "Authentication:Google:ClientSecret" "<GOOGLE_CLIENT_SECRET>"
dotnet user-secrets set --project $apiProject "Frontend:BaseUrl" "http://localhost:5173"
```

Bash/zsh:

```bash
dotnet user-secrets set --project "$api_project" 'Authentication:Google:ClientId' '<GOOGLE_CLIENT_ID>'
dotnet user-secrets set --project "$api_project" 'Authentication:Google:ClientSecret' '<GOOGLE_CLIENT_SECRET>'
dotnet user-secrets set --project "$api_project" 'Frontend:BaseUrl' 'http://localhost:5173'
```

Đăng ký callback URI của backend với Google provider:

```text
https://localhost:7149/signin-google
```

#### SMTP/OTP — tùy chọn

PowerShell:

```powershell
dotnet user-secrets set --project $apiProject "EmailSettings:SmtpServer" "smtp.gmail.com"
dotnet user-secrets set --project $apiProject "EmailSettings:Port" "587"
dotnet user-secrets set --project $apiProject "EmailSettings:SenderName" "CTRL SHIFT N"
dotnet user-secrets set --project $apiProject "EmailSettings:SenderEmail" "<SMTP_EMAIL>"
dotnet user-secrets set --project $apiProject "EmailSettings:Password" "<SMTP_APP_PASSWORD>"
```

Bash/zsh dùng cùng các key trên với biến `$api_project`.

#### Rosbag mẫu — tùy chọn

Cấu hình đường dẫn tuyệt đối đến thư mục chứa `.db3` và `metadata.yaml` nếu có:

PowerShell:

```powershell
dotnet user-secrets set --project $apiProject "Rosbag:SamplesPath" "D:\data\rosbags"
```

Bash/zsh:

```bash
dotnet user-secrets set --project "$api_project" 'Rosbag:SamplesPath' '/data/rosbags'
```

### 3. Cập nhật database

```text
dotnet ef database update \
  --project "./BackEnd(ASP.Net)/Infrastructure/Infrastructure.csproj" \
  --startup-project "./BackEnd(ASP.Net)/API/API.csproj"
```

PowerShell chấp nhận lệnh trên trên một dòng. Nếu muốn xuống dòng trong PowerShell, thay `\` bằng dấu backtick.

### 4. Chạy backend

Không phụ thuộc vào `launchSettings.json`: file này có thể chỉ tồn tại trên máy phát triển và không được Git track.

#### HTTPS — khuyến nghị

Trust certificate một lần:

```text
dotnet dev-certs https --trust
```

PowerShell:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "https://localhost:7149;http://localhost:5143"
dotnet run --project ".\BackEnd(ASP.Net)\API\API.csproj" --no-launch-profile
```

Bash/zsh:

```bash
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS='https://localhost:7149;http://localhost:5143' \
dotnet run --project './BackEnd(ASP.Net)/API/API.csproj' --no-launch-profile
```

Backend:

```text
HTTPS: https://localhost:7149
HTTP:  http://localhost:5143
```

OpenAPI chỉ được bật trong môi trường `Development`:

```text
https://localhost:7149/openapi/v1.json
```

#### HTTP-only — dùng khi không thể trust certificate

Chỉ nên dùng cho phát triển local. Đặt `ASPNETCORE_URLS=http://localhost:5143`, đồng thời đặt frontend `VITE_API_URL=http://localhost:5143`. Google OAuth và các luồng yêu cầu secure cookie nên dùng HTTPS.

Nếu máy có `launchSettings.json`, vẫn có thể chạy `dotnet run --launch-profile https` từ thư mục project API, nhưng đây không phải cách khởi động portable được tài liệu khuyến nghị.

### 5. Chạy frontend

`VITE_API_URL` là tùy chọn. Nếu không khai báo, frontend dùng `https://localhost:7149`.

Khi cần đổi API URL, tạo `FrontEnd(ReactJS)/.env.local`:

```dotenv
VITE_API_URL=https://localhost:7149
```

Chạy frontend:

```text
npm --prefix "./FrontEnd(ReactJS)" run dev
```

Mở `http://localhost:5173/`.

Frontend sử dụng `HashRouter`. Một số route chính:

```text
http://localhost:5173/#/login
http://localhost:5173/#/dashboard
http://localhost:5173/#/bags
http://localhost:5173/#/sessions/<SESSION_ID>/overview
```

## Biến cấu hình

ASP.NET Core chuyển dấu `:` trong configuration key thành `__` khi dùng biến môi trường.

| Biến | Mức độ | Mô tả |
|---|---:|---|
| `ASPNETCORE_ENVIRONMENT` | Khuyến nghị local | Đặt `Development` để bật OpenAPI. |
| `ASPNETCORE_URLS` | Tùy chọn | URL backend lắng nghe. |
| `ConnectionStrings__DefaultConnection` | Bắt buộc | Connection string MySQL/TiDB. |
| `Jwt__Issuer` | Bắt buộc | JWT issuer. |
| `Jwt__Audience` | Bắt buộc | JWT audience. |
| `Jwt__ExpiresMinutes` | Tùy chọn | Thời gian sống access token; mặc định trong code là 60 phút. |
| `Jwt__Key` | Bắt buộc | Khóa ký JWT dài và ngẫu nhiên. |
| `Frontend__BaseUrl` | Bắt buộc với OAuth | URL frontend dùng khi backend redirect sau OAuth. |
| `Authentication__Google__ClientId` | Bắt buộc với OAuth | Google OAuth client ID. |
| `Authentication__Google__ClientSecret` | Bắt buộc với OAuth | Google OAuth client secret. |
| `EmailSettings__SmtpServer` | Bắt buộc với email/OTP | SMTP server. |
| `EmailSettings__Port` | Bắt buộc với email/OTP | SMTP port. |
| `EmailSettings__SenderName` | Tùy chọn | Tên người gửi. |
| `EmailSettings__SenderEmail` | Bắt buộc với email/OTP | Tài khoản gửi email. |
| `EmailSettings__Password` | Bắt buộc với email/OTP | SMTP/app password. |
| `Redis__Configuration` | Cần cho đầy đủ chức năng | Redis connection string chính. |
| `Redis__ConnectionString` | Thay thế | Được dùng nếu `Redis__Configuration` rỗng. |
| `Redis__InstanceName` | Tùy chọn | Prefix cho key Redis. |
| `MongoDbSettings__ConnectionString` | Cần cho NoSQL | MongoDB connection string. |
| `MongoDbSettings__DatabaseName` | Cần cho NoSQL | Tên MongoDB database. |
| `Rosbag__SamplesPath` | Tùy chọn | Thư mục chứa rosbag mẫu. |
| `VITE_API_URL` | Tùy chọn | Base URL frontend dùng để gọi API; mặc định `https://localhost:7149`. |
| `AppSettings__BaseUrl` | Chưa sử dụng | Có trong cấu hình cũ nhưng hiện không được source đọc. |
| `Cloudinary__*` | Chưa hoạt động đầy đủ | Service hiện là stub, chưa upload/delete thật trên Cloudinary. |

## API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản. |
| `POST` | `/api/auth/login` | Đăng nhập và lấy access token. |
| `GET` | `/api/auth/login-google` | Bắt đầu đăng nhập Google. |
| `POST` | `/api/auth/forgot-password` | Gửi OTP quên mật khẩu. |
| `POST` | `/api/auth/reset-password` | Đặt lại mật khẩu bằng OTP. |
| `GET` | `/api/dashboard/stats` | Thống kê Dashboard; cần Redis theo implementation hiện tại. |
| `GET` | `/api/bags` | Danh sách rosbag. |
| `GET` | `/api/bags/{id}` | Chi tiết rosbag. |
| `GET` | `/api/bags/samples` | Danh sách rosbag mẫu. |
| `POST` | `/api/bags/inspect` | Phân tích rosbag từ đường dẫn hoặc tên mẫu. |
| `POST` | `/api/bags/upload-and-inspect` | Upload file `.db3` và phân tích. |
| `POST` | `/api/sessions/start` | Bắt đầu phiên phân tích. |
| `GET` | `/api/sessions/{id}` | Lấy chi tiết phiên. |
| `GET` | `/api/reviews` | Danh sách kết luận cần duyệt. |
| `POST` | `/api/reviews/{findingId}/decision` | Gửi quyết định duyệt. |
| `GET` | `/api/reports` | Danh sách báo cáo. |
| `POST` | `/api/reports` | Tạo báo cáo. |
| `GET` | `/api/admin/ai-config` | Lấy cấu hình AI. |
| `GET` | `/api/admin/ai-usage` | Lấy thống kê sử dụng AI. |

Các ID như bag, session, finding và report phải lấy từ response thực tế; không giả định các ID mẫu luôn tồn tại.

### Ví dụ PowerShell

```powershell
$api = "https://localhost:7149"

$loginBody = @{
  email = "<REGISTERED_EMAIL>"
  password = "<PASSWORD>"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$api/api/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri "$api/api/bags" -Headers $headers
```

### Ví dụ Bash/zsh với curl

```bash
curl --request POST 'https://localhost:7149/api/auth/login' \
  --header 'Content-Type: application/json' \
  --data '{"email":"<REGISTERED_EMAIL>","password":"<PASSWORD>"}'
```

Nếu certificate local chưa được hệ điều hành tin cậy, hãy trust certificate thay vì tắt kiểm tra TLS. Chỉ dùng tùy chọn bỏ qua TLS trong môi trường local tạm thời và không dùng trong production.

### Payload thường dùng

Kiểm tra rosbag bằng đường dẫn:

```json
{
  "bagPath": "/absolute/path/to/rosbag.db3"
}
```

Hoặc bằng tên rosbag trong `Rosbag:SamplesPath`:

```json
{
  "sampleName": "sample.db3"
}
```

Bắt đầu phân tích:

```json
{
  "bagId": "<BAG_ID>",
  "robotProfile": "RAV-13",
  "windowSeconds": 10,
  "deadTopicSeconds": 3,
  "clockThresholdMs": 30,
  "tfToleranceMs": 50
}
```

Gửi quyết định duyệt:

```json
{
  "decision": "approved",
  "note": "Đã kiểm tra bằng chứng kỹ thuật."
}
```

Enum backend hiện nhận tên không phân biệt hoa/thường: `approved`, `rejected`, `changesNeeded` và `pending`. Với thao tác duyệt thông thường chỉ nên gửi `approved`, `rejected` hoặc `changesNeeded`.

Không gửi `changes` ở thời điểm hiện tại: giá trị này không khớp `ChangesNeeded` và handler backend đang fallback quyết định không hợp lệ thành `approved`.

Tạo báo cáo:

```json
{
  "sessionId": "<SESSION_ID>",
  "title": "Báo cáo chẩn đoán",
  "summaryMarkdown": "# Kết luận\nNội dung báo cáo."
}
```

## Build

Backend:

```text
dotnet build "./BackEnd(ASP.Net)/API/API.csproj"
```

Frontend:

```text
npm --prefix "./FrontEnd(ReactJS)" run build
npm --prefix "./FrontEnd(ReactJS)" run preview
```

## Migration database

Tạo migration:

```text
dotnet ef migrations add <MIGRATION_NAME> \
  --project "./BackEnd(ASP.Net)/Infrastructure/Infrastructure.csproj" \
  --startup-project "./BackEnd(ASP.Net)/API/API.csproj"
```

Áp dụng migration:

```text
dotnet ef database update \
  --project "./BackEnd(ASP.Net)/Infrastructure/Infrastructure.csproj" \
  --startup-project "./BackEnd(ASP.Net)/API/API.csproj"
```

## Troubleshooting

### `dotnet run --launch-profile https` báo không tìm thấy profile

Không dùng launch profile. Chạy theo mục **Chạy backend** bằng `ASPNETCORE_URLS` và `--no-launch-profile`.

### `dotnet ef` không được nhận diện

Cài `dotnet-ef` 9.0.0 theo mục **Yêu cầu hệ thống**, sau đó mở terminal mới và kiểm tra lại `dotnet ef --version`.

### `ERR_CERT_AUTHORITY_INVALID`

Thử trước:

```text
dotnet dev-certs https --trust
```

Đóng hoàn toàn trình duyệt rồi mở lại. Chỉ dùng `dotnet dev-certs https --clean` khi certificate store thực sự lỗi; lệnh này xóa development certificate của các project .NET khác trên máy.

### Frontend không gọi được API

Kiểm tra:

1. Backend đang chạy đúng URL.
2. `VITE_API_URL` khớp protocol và port của backend.
3. Frontend đang chạy từ `http://localhost:5173` hoặc `https://localhost:5173`, là các origin được CORS cho phép hiện tại.
4. HTTPS certificate đã được trust.
5. Sau khi thay `.env.local`, đã khởi động lại Vite.

### Dashboard hoặc Session báo lỗi resolve `IRedisService`

Kiểm tra `Redis:Configuration`/`Redis__Configuration` và bảo đảm Redis có thể kết nối được. Memory cache hiện chưa thay thế được toàn bộ `IRedisService`.

### Session hoặc Report lỗi MongoDB

Kiểm tra cả `MongoDbSettings:ConnectionString` và `MongoDbSettings:DatabaseName`. Bảo đảm database có thể truy cập từ máy chạy backend.

### `/api/bags/samples` trả danh sách rỗng

Đặt `Rosbag:SamplesPath` tới thư mục có file `.db3`. Dùng đường dẫn tuyệt đối và bảo đảm process backend có quyền đọc thư mục.

### Backend dừng ngay khi khởi động

Kiểm tra:

- `ConnectionStrings:DefaultConnection` tồn tại và MySQL/TiDB truy cập được.
- `Jwt:Issuer`, `Jwt:Audience` và `Jwt:Key` đã cấu hình.
- Redis và MongoDB đang chạy nếu sử dụng các luồng phụ thuộc vào chúng.
- File cấu hình không chứa credential hết hạn hoặc sai định dạng.

## Bảo mật và production

- Không commit password, connection string, JWT key, OAuth secret, SMTP password, Redis token hoặc API key.
- Dùng .NET User Secrets cho local; dùng secret manager của nền tảng khi deploy.
- Không đặt token thật trong tài liệu, ảnh chụp màn hình, log hoặc issue tracker.
- Nếu credential từng được commit, gửi qua chat hoặc chia sẻ ngoài phạm vi cho phép, hãy rotate credential; chỉ xóa khỏi file là chưa đủ.
- Không dùng demo login của frontend như cơ chế authentication production.
- Rà soát `[Authorize]`, role/policy, CORS, HTTPS, rate limiting và logging dữ liệu nhạy cảm trước khi public API.
- Không sử dụng certificate development trong production.
