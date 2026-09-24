namespace Application.Features.Authentication.Password
{
	public static class EmailTemplateBuilder
	{
		public static string BuildOtpEmailHtml(string userName, string otpCode)
		{
			return $@"
<div style='font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;'>
	<h2 style='color: #1c5c43; margin-top: 0;'>Khôi phục mật khẩu - Ctrl Shift N</h2>
	<p>Xin chào <strong>{userName}</strong>,</p>
	<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản hệ thống <strong>Ctrl Shift N</strong>.</p>
	<div style='background: #f4f8f5; border-left: 4px solid #1c5c43; padding: 16px; margin: 20px 0; text-align: center;'>
		<p style='margin: 0; font-size: 14px; color: #555;'>Mã OTP xác thực của bạn là:</p>
		<h1 style='color: #1c5c43; font-size: 32px; letter-spacing: 4px; margin: 10px 0 0;'>{otpCode}</h1>
	</div>
	<p style='font-size: 13px; color: #666;'>Mã OTP này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
	<hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
	<p style='font-size: 12px; color: #999; text-align: center;'>Ctrl Shift N Team</p>
</div>";
		}
	}
}
