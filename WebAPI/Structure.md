# Backend Web API and Frontend Source Structure

## 1. Tổng quan
Dự án backend nằm trong thư mục `Source-Code/BackEnd(ASP.Net)` và đang theo kiến trúc layered / clean-ish. Dự án frontend nằm trong thư mục `Source-Code/FrontEnd(ReactJS)` và đang theo kiến trúc modular React + feature-based structure.

- `API/` : giao diện Web API, controller, middleware, endpoint routing.
- `Application/` : business logic, DTO, CQRS feature handlers, validation, interface contracts.
- `Domain/` : entity domain model, enum, exception, constants.
- `Infrastructure/` : EF Core DbContext, repositories, transaction/UoW, persistence configuration.

---

## 2. Kiến trúc frontend ReactJS

Dự án frontend nằm trong thư mục `Source-Code/FrontEnd(ReactJS)/` và được tổ chức theo hướng feature-oriented architecture, tách rõ phần UI, API, hook, state và type dữ liệu theo từng chức năng.

### Cấu trúc thư mục frontend gợi ý

```text
Source-Code/FrontEnd(ReactJS)/
├─ src/
│  ├─ app/                    # Bộ định tuyến, layout toàn cục, cấu hình provider toàn cục như QueryClient, AuthProvider
│  ├─ assets/                 # Icon, ảnh tĩnh, fonts, hình ảnh dùng chung
│  ├─ components/             # UI component dùng chung như Button, Modal, Input, Layout, Card
│  ├─ features/               # Chia logic theo từng module chức năng
│  │  ├─ auth/
│  │  │  ├─ api/              # Các hàm gọi API riêng dành cho auth: login, register,refresh token
│  │  │  ├─ components/       # UI riêng của auth: LoginForm, SocialLoginButtons
│  │  │  ├─ hooks/            # Custom hooks / React Query hoặc SWR hook cho auth
│  │  │  └─ types/            # Type/DTO request/response tương ứng với backend
│  │  └─ products/
│  │     ├─ api/              # getProducts, getProductById
│  │     ├─ components/
│  │     ├─ hooks/
│  │     └─ types/
│  ├─ services/               # Cấu hình client tầng thấp: Axios hoặc Fetch instance, interceptor
│  │  └─ apiClient.ts         # Xử lý BaseURL, JWT token, auto-refresh token, retry
│  ├─ stores/                 # State global như Zustand/Redux: auth, theme, shopping cart
│  └─ utils/                  # Helper: formatCurrency, formatDate, validation
└─ package.json
```

### Mô tả từng phần frontend

- `app/`: chứa router, layout, provider toàn cục như `QueryClientProvider`, `AuthProvider`, theme provider.
- `assets/`: chứa biểu tượng, hình ảnh tĩnh, font và các asset dùng chung.
- `components/`: chứa component UI có tính tái sử dụng cao, các component như `Button`, `Modal`, `Input`, `Layout`.
- `features/`: chứa code theo từng domain/module chức năng. Mỗi feature nên giữ `api`, `components`, `hooks`, `types` riêng để dễ mở rộng và tách biệt logic.
- `services/`: chứa layer gọi API phía client, ví dụ `apiClient.ts` quản lý base URL, header token, interceptor, refresh token, retry.
- `stores/`: dùng cho state toàn cục như thông tin user đang login, theme, giỏ hàng.
- `utils/`: chứa các helper dùng chung như format dữ liệu, validate input, parse date.

---

## 3. Kiến trúc backend theo dạng cây

Backend đang nằm ở `Source-Code/BackEnd(ASP.Net)/` và được tổ chức theo kiến trúc Layered/Clean-ish:

```text
Source-Code/BackEnd(ASP.Net)/
├─ API/                              # Điểm vào HTTP, controller, định tuyến, middleware
│  ├─ Program.cs                    # Khởi tạo ứng dụng, đăng ký dịch vụ, pipeline
│  ├─ Controller/                   # Controller API theo chức năng
│  │  ├─ AuthController/             # Login, Google login, phát sinh JWT
│  │  ├─ Common/                    # BaseController, helper API dùng chung
│  │  ├─ Dashboard/                 # API dashboard
│  │  └─ RoleForUser/               # API quản lý quan hệ role và user
│  └─ Middlewares/                  # Middleware xử lý toàn cục
├─ Application/                      # Logic nghiệp vụ và orchestration use-case
│  ├─ Common/                        # DTO dùng chung, validation, constant, behavior
│  └─ Features/                      # Thư mục feature theo CQRS/MediatR
│     ├─ Admin/                      # Quy trình quản trị
│     ├─ Authentication/             # Logic đăng nhập, Google login, xác thực JWT
│     ├─ Clubs/                      # Logic nghiệp vụ liên quan đến Club
│     ├─ System/                     # Logic cấu hình hệ thống
│     └─ User/                       # Logic profile và nghiệp vụ người dùng
├─ Domain/                            # Entity nghiệp vụ và contract
│  ├─ Entities/                      # Domain entity model
│  ├─ Enums/                         # Enum nghiệp vụ
│  ├─ Exception/                     # Exception riêng của domain
│  └─ Helper/                        # Helper tiện ích cho domain
└─ Infrastructure/                   # Lớp truy cập dữ liệu và triển khai chi tiết
   ├─ Persistence/                   # EF Core context & model config
   │  ├─ AppDbContext.cs             # Main EF Core DbContext
   │  └─ Configurations/             # Entity configuration mapping
   ├─ Repository/                     # Triển khai repository
   │  ├─ GenericRepository.cs        # CRUD base repository
   │  ├─ PagenationRepository.cs      # Pagination repository helper
   │  ├─ UnitOfWork.cs                # Unit of work / transaction coordination
   │  └─ UserRepository.cs           # User-focused repository
   └─ Storage/                       # File or storage helpers
```

Mô tả:

- `API/`: tiếp nhận request HTTP, định tuyến qua controller, xử lý middleware và trả response JSON.
- `Application/`: chứa business logic, command/query, DTO, validation, interface contract theo pattern CQRS / MediatR.
- `Domain/`: chứa entity nghiệp vụ, enum, exception và helper dùng chung.
- `Infrastructure/`: chứa `AppDbContext`, repository implementation, `UnitOfWork`, persistence configuration và storage.

---



## 4. Mô tả từng tầng

### API layer
Tầng API nhận HTTP request, định tuyến, gọi controller và trả response JSON. Controller có thể kế thừa `BaseController` để dùng chung helper log, notification. Một số controller tích hợp `IMediator` để bắn command/query xuống tầng Application.

Ví dụ:
- `LoginController` trong `API/Controller/AuthController/LoginController.cs`
- `AuthController` trong `API/Controller/AuthController/*`
- `BaseController` trong `API/Controller/Common/BaseController.cs`

### Application layer
Tầng Application chứa business feature theo kiểu CQRS / MediatR:

- `Features/Admin/...`
- `Features/Authentication/...`
- `Features/Clubs/...`
- `Features/System/...`
- `Features/User/...`

Mỗi feature thường có:
- DTO request/response
- command/query
- handler
- validation
- mapper/profile (nếu có)

### Domain layer
Tầng Domain chứa model nghiệp vụ và các enum/exception:

- `Entities/`
- `Enums/`
- `Exception/`
- `Helper/`

Domain layer không nên phụ thuộc vào Infrastructure và API.

### Infrastructure layer
Tầng Infrastructure chứa:

- `AppDbContext` quản lý EF Core model
- `Configurations/` mapping entities vào DB schema
- `Repository/` implements GenericRepository và UnitOfWork
- `Storage/` / data storage helper

`AppDbContext` đọc connection string từ `IConfiguration`, environment, và fallback `appsettings.json`.

---

## 5. Workflow web API chính của source code

### Request lifecycle

1. Request đến `API` project qua controller.
2. Controller nhận request, validate, và xây `Command/Query` DTO.
3. Controller gọi `_mediator.Send(command)` hoặc `_mediator.Send(query)`.
4. MediatR dispatch xuống handler tương ứng trong `Application/Features/...`.
5. Handler gọi repository hoặc service interface từ tầng Application.
6. Infrastructure implement repository / unit of work, truy cập `AppDbContext` và MySQL.
7. Handler map entity sang DTO hoặc trả response model.
8. Controller trả `Ok(...)`, `BadRequest(...)`, `Redirect(...)` hoặc `Created(...)` về client.

### Ví dụ workflow: Google login

File `API/Controller/AuthController/LoginController.cs`:

```csharp
[HttpGet("login-google")]
public IActionResult LoginGoogle()
{
    var properties = new AuthenticationProperties { RedirectUri = "/api/auth/google-login-response" };
    return Challenge(properties, GoogleDefaults.AuthenticationScheme);
}
```

Sau khi Google xác thực thành công:

```csharp
[HttpGet("google-login-response")]
public async Task<IActionResult> GoogleResponse()
{
    var authenticateResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    var command = new GoogleLoginCommand(authenticateResult.Principal);
    var loginResult = await _mediator.Send(command);
    await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    var reactFrontendUrl = $"https://localhost:5173/login-success?token={loginResult.AccessToken}";
    return Redirect(reactFrontendUrl);
}
```

Workflow thực tế:

- Browser/Fronend -> `api/auth/login-google`
- ASP.NET gọi Google Challenge
- Google redirect về `api/auth/google-login-response`
- Cookie xác thực trung gian được đọc
- `GoogleLoginCommand` được gửi qua `IMediator`
- Handler trong `Application/Features/Authentication/...` xử lý user, token, DB
- Trả JWT qua redirect URL cho frontend

### Ví dụ workflow: login email/password

`LoginController`:

```csharp
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequestDTO request)
{
    var command = new LoginCommand(request);
    var loginResult = await _mediator.Send(command);
    return Ok(loginResult);
}
```

- Request DTO -> `LoginCommand`
- Handler trong `Application/Features/Authentication/Login/Handler/...`
- Repository hoặc service query `UserRepository`/`UnitOfWork`
- Response DTO `LoginResponseDTO`

---

## 6. Kích hoạt dependency và data access

`Infrastructure/Persistence/AppDbContext.cs`:

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    if (!optionsBuilder.IsConfigured)
    {
        var connectionString = _configuration?.GetConnectionString("DefaultConnection");
        optionsBuilder.UseMySql(connectionString, ServerVersion.Parse("8.4.8-mysql"));
    }
}
```

Đây là cách `DbContext` được cấu hình để làm việc với MySQL bằng Pomelo provider.

`Infrastructure/Repository/UnitOfWork.cs` đóng vai trò như transaction / repository factory, quản lý các repository cho `User`, `Profile`, `Role`, `Notification`, `Department`, `EventWaitlist`, `Feedback`, `StudentQuizScore`, `TeamMember`, `EventAgenda`, `Ticket`.

---

## 7. Nền tảng thiết kế hiện tại

Source code đang dùng các pattern sau:

- Controller-based API
- MediatR CQRS
- Repository + UnitOfWork
- EF Core DbContext mapping
- Authentication Google + JWT Bearer
- Global activity logging và notification helpers trong `BaseController`

---

## 8. Lưu ý khi phát triển

- `Program.cs` hiện tại đang là template `WeatherForecast` sample, chưa phải là pipeline hoàn chỉnh của source thực. Nếu thực hiện Web API production, cần thêm:
  - `builder.Services.AddControllers()`
  - `builder.Services.AddMediatR(...)`
  - `builder.Services.AddDbContext<AppDbContext>(...)`
  - `builder.Services.AddAuthentication(...)`

---