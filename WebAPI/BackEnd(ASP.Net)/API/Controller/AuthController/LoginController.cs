using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Authentication;
using Application.Features.Authentication.Login;
using Application.Features.Authentication.Login.Handler;
using Application.Interfaces.Logging;
using API.Middlewares.Extentions;
using Domain.Enums;

using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controller;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth-limiter")]
public class LoginController : ControllerBase
{
	private readonly IMediator _mediator;
	private readonly IUserActivityLogService _userActivityLogService;
	private readonly IConfiguration _configuration;

	public LoginController(IMediator mediator, IUserActivityLogService userActivityLogService, IConfiguration configuration)
	{
		_mediator = mediator;
		_userActivityLogService = userActivityLogService;
		_configuration = configuration;
	}

	// 1. Khi Frontend click, trình duyệt sẽ nhảy vào đây đầu tiên
	[HttpGet("login-google")]
	public IActionResult LoginGoogle()
	{
		// Sau khi Google quét vân tay xong, nó sẽ bắt trình duyệt quay lại endpoint "google-response" ở dưới
        // Use a fixed redirect URI that matches the controller action route.
		// This avoids ambiguity when multiple controllers expose actions named "GoogleResponse".
		var properties = new AuthenticationProperties { RedirectUri = "/api/auth/google-login-response" };

		// Lệnh Challenge này sẽ tự động sinh link Google và trả về mã 302 Redirect để trình duyệt tự nhảy sang Google
		return Challenge(properties, GoogleDefaults.AuthenticationScheme);
	}

	// 2. Nơi xử lý ngầm sau khi người dùng chọn tài khoản Gmail thành công
    [HttpGet("google-login-response")]
	public async Task<IActionResult> GoogleResponse()
	{
		var frontendBaseUrl = (_configuration["Frontend:BaseUrl"] ?? "https://localhost:5173").TrimEnd('/');

		// 1. Hứng lấy thông tin từ Cookie trung gian của Google
		var authenticateResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

		if (!authenticateResult.Succeeded)
			return Redirect($"{frontendBaseUrl}/#/login?error={Uri.EscapeDataString("Xác thực từ Google thất bại hoặc đã bị hủy.")}");

		try
		{
			// 2. Bắn vào MediatR để xử lý logic (Lưu DB, Tạo User nếu chưa có, sinh mã JWT)
			var command = new GoogleLoginCommand(authenticateResult.Principal);
			var loginResult = await _mediator.Send(command); // loginResult này là LoginResponseDTO

			// 3. Đăng xuất Cookie trung gian ngay để làm sạch bộ nhớ
			await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

			// 4. ĐIỀU HƯỚNG QUAY LẠI REACT: Đính Token lên URL để React bắt lấy
			var reactFrontendUrl = $"{frontendBaseUrl}/#/login-success?token={loginResult.AccessToken}";

			return Redirect(reactFrontendUrl);
		}
		catch (Exception ex)
		{
			await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
			return Redirect($"{frontendBaseUrl}/#/login?error={Uri.EscapeDataString(ex.Message)}");
		}
	}
	[HttpPost("login")]
	public async Task<IActionResult> Login([FromBody] LoginRequestDTO request, CancellationToken cancellationToken)
	{
		if (!ModelState.IsValid) return BadRequest(ModelState);

		// 1. Gói dữ liệu vào Command và bắn qua MediatR xuống tầng Application xử lý
		var command = new LoginCommand(request);
		var loginResult = await _mediator.Send(command, cancellationToken); // Trả về LoginResponseDTO

		// 2. Trả thẳng cục dữ liệu JSON về cho Axios của React nhận lấy
		return Ok(loginResult);
	}

	
	[HttpPost("logout")]
	public async Task<IActionResult> Logout()
	{
		var userId = User.GetUserId();
		if (!string.IsNullOrWhiteSpace(userId))
		{
			await _userActivityLogService.LogActivityAsync(
				userId,
				UserActionType.Logout,
				targetId: userId,
				targetType: TargetType.User,
				description: "User logged out",
				requestPath: "/api/auth/logout",
				httpMethod: "POST");
		}

		// 1. Dọn dẹp session Cookie trung gian (nếu đăng nhập bằng Google)
		await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

		// 2. Xóa cookie auth_token (nếu có lưu token ở cookie)
		var cookieDomain = _configuration["CookieSettings:Domain"];
		Response.Cookies.Delete("auth_token", new CookieOptions
		{
			Path = "/",
			Secure = true,
			SameSite = SameSiteMode.Strict,
			Domain = string.IsNullOrWhiteSpace(cookieDomain) ? null : cookieDomain
		});

		// 3. Phản hồi cho Frontend React
		return Ok(new { message = "Logged out successfully" });
	}

}