using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Authentication;
using Application.Features.Authentication.Login;
using Application.Features.Authentication.Login.Handler;

namespace API.Controller;

[ApiController]
[Route("api/auth")]
public class LoginController : ControllerBase
{
	private readonly IMediator _mediator;

	public LoginController(IMediator mediator)
	{
		_mediator = mediator;
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
		// 1. Hứng lấy thông tin từ Cookie trung gian của Google
		var authenticateResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

		if (!authenticateResult.Succeeded)
			return BadRequest("Xác thực từ Google thất bại.");

		// 2. Bắn vào MediatR để xử lý logic (Lưu DB, Tạo User nếu chưa có, sinh mã JWT)
		var command = new GoogleLoginCommand(authenticateResult.Principal);
		var loginResult = await _mediator.Send(command); // loginResult này là LoginResponseDTO

		// 3. Đăng xuất Cookie trung gian ngay để làm sạch bộ nhớ
		await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

		// 4. ĐIỀU HƯỚNG QUAY LẠI REACT: Đính Token lên URL để React bắt lấy
		// (Bạn có thể đính thêm tên user, avatar nếu muốn, hoặc chỉ cần AccessToken là đủ)
		var reactFrontendUrl = $"https://localhost:5173/login-success?token={loginResult.AccessToken}";

		return Redirect(reactFrontendUrl);
	}
	[HttpPost("login")]
	public async Task<IActionResult> Login([FromBody] LoginRequestDTO request)
	{
		if (!ModelState.IsValid) return BadRequest(ModelState);

		// 1. Gói dữ liệu vào Command và bắn qua MediatR xuống tầng Application xử lý
		var command = new LoginCommand(request);
		var loginResult = await _mediator.Send(command); // Trả về LoginResponseDTO

		// 2. Trả thẳng cục dữ liệu JSON về cho Axios của React nhận lấy
		return Ok(loginResult);
	}

	[HttpPost("logout")]
	public async Task<IActionResult> Logout()
	{
		await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
		return NoContent();
	}
}