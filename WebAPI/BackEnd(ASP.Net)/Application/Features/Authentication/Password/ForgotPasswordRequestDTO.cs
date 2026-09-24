using System.ComponentModel.DataAnnotations;

namespace Application.Features.Authentication.Password
{
	public class ForgotPasswordRequestDTO
	{
		[Required(ErrorMessage = "Vui lòng nhập email")]
		[EmailAddress(ErrorMessage = "Email không hợp lệ")]
		public string Email { get; set; } = string.Empty;
	}

	public class ForgotPasswordResponse
	{
		public bool Success { get; set; }
		public string Message { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string OtpCode { get; set; } = string.Empty;
	}

	public class ResetPasswordRequestDTO
	{
		[Required(ErrorMessage = "Vui lòng nhập email")]
		[EmailAddress(ErrorMessage = "Email không hợp lệ")]
		public string Email { get; set; } = string.Empty;

		[Required(ErrorMessage = "Vui lòng nhập mã OTP")]
		public string OtpCode { get; set; } = string.Empty;

		[Required(ErrorMessage = "Vui lòng nhập mật khẩu mới")]
		[MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")]
		public string NewPassword { get; set; } = string.Empty;
	}

	public class ResetPasswordResponse
	{
		public bool Success { get; set; }
		public string Message { get; set; } = string.Empty;
	}
}
