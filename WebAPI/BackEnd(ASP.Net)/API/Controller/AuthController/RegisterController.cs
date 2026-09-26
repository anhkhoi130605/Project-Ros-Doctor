using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Authentication;
using Application.Features.Authentication.Login;
using Application.Features.Authentication.Login.Handler;
using Application.DTOs.Authentication.Register;
using Application.Features.Authentication.Register.Handler;

namespace API.Controller;

[ApiController]
[Route("api/auth")]
public class RegisterController : ControllerBase
{
	private readonly IMediator _mediator;
	private readonly IConfiguration _configuration;

	public RegisterController(IMediator mediator, IConfiguration configuration)
	{
		_mediator = mediator;
		_configuration = configuration;
	}

	// 1. Khi Frontend click, trình duyệt sẽ nhảy vào đây đầu tiên
	[HttpGet("register-google")]
	public IActionResult RegisterGoogle()
	{
		// Sau khi Google quét vân tay xong, nó sẽ bắt trình duyệt quay lại endpoint "google-response" ở dưới
        // Use explicit redirect path for register flow
		var properties = new AuthenticationProperties { RedirectUri = "/api/auth/google-register-response" };

		// Lệnh Challenge này sẽ tự động sinh link Google và trả về mã 302 Redirect để trình duyệt tự nhảy sang Google
		return Challenge(properties, GoogleDefaults.AuthenticationScheme);
	}

	// 2. Nơi xử lý ngầm sau khi người dùng chọn tài khoản Gmail thành công
    [HttpGet("google-register-response")]
	public async Task<IActionResult> GoogleResponse()
	{
		var frontendBaseUrl = (_configuration["Frontend:BaseUrl"] ?? "https://localhost:5173").TrimEnd('/');

		// 1. Hứng lấy thông tin từ Cookie trung gian của Google
		var authenticateResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

		if (!authenticateResult.Succeeded)
			return Redirect($"{frontendBaseUrl}/login?error={Uri.EscapeDataString("Xác thực từ Google thất bại hoặc đã bị hủy.")}");

		try
		{
			// 2. Bắn vào MediatR để xử lý logic (Lưu DB, Tạo User nếu chưa có, sinh mã JWT)
			var command = new GoogleLoginCommand(authenticateResult.Principal);
			var loginResult = await _mediator.Send(command); // loginResult này là LoginResponseDTO

			// 3. Đăng xuất Cookie trung gian ngay để làm sạch bộ nhớ
			await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

			// 4. ĐIỀU HƯỚNG QUAY LẠI REACT: Đính Token lên URL để React bắt lấy
			var reactFrontendUrl = $"{frontendBaseUrl}/login-success?token={loginResult.AccessToken}";

			return Redirect(reactFrontendUrl);
		}
		catch (Exception ex)
		{
			await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
			return Redirect($"{frontendBaseUrl}/login?error={Uri.EscapeDataString(ex.Message)}");
		}
	}
    [HttpPost("register")]
	public async Task<IActionResult> Register([FromBody] RegisterUserRequestDTO request, CancellationToken cancellationToken)
	{
		if (!ModelState.IsValid) return BadRequest(ModelState);

		// 1. Gói dữ liệu vào Command và bắn qua MediatR xuống tầng Application xử lý
		var command = new RegisterCommand(request);
		try
		{
			var registerResult = await _mediator.Send(command, cancellationToken);
			// 2. Trả thẳng cục dữ liệu JSON về cho Axios của React nhận lấy
			return Ok(registerResult);
		}
		catch (Exception ex)
		{
			// Trả về BadRequest nếu email đã tồn tại hoặc dữ liệu không hợp lệ
			return BadRequest(new { StatusCode = 400, Message = ex.Message, Detail = ex.InnerException?.Message });
		}
	}
}