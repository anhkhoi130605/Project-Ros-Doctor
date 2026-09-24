using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Application.Interfaces;
using Infrastructure.ConfigModel;

namespace Infrastructure.Services
{
	public class SmtpEmailService : IEmailService
	{
		private readonly EmailSettings _settings;

		// Cache template trong RAM ngay từ lần đầu gọi
		private static readonly Lazy<string> _templateCache = new Lazy<string>(() =>
		{
			var assembly = typeof(SmtpEmailService).Assembly;
			const string resourceName = "Infrastructure.Templates.OtpEmailTemplate.html";

			using var stream = assembly.GetManifestResourceStream(resourceName)
				?? throw new InvalidOperationException($"Không tìm thấy template nhúng: {resourceName}");

			using var reader = new StreamReader(stream);
			return reader.ReadToEnd();
		});

		public SmtpEmailService(IOptions<EmailSettings> options)
		{
			_settings = options.Value;
		}

		public async Task SendEmailAsync(string to, string subject, string htmlBody)
		{
			using var client = new SmtpClient(_settings.SmtpServer, _settings.Port)
			{
				Credentials = new NetworkCredential(_settings.SenderEmail, _settings.Password),
				EnableSsl = true
			};

			var mail = new MailMessage()
			{
				From = new MailAddress(_settings.SenderEmail, _settings.SenderName),
				Subject = subject,
				Body = htmlBody,
				IsBodyHtml = true
			};
			mail.To.Add(to);

			await client.SendMailAsync(mail);
		}

		public async Task SendOtpEmailAsync(string to, string userName, string otpCode)
		{
			string safeUserName = WebUtility.HtmlEncode(userName ?? string.Empty);
			string safeOtpCode = WebUtility.HtmlEncode(otpCode ?? string.Empty);

			// Lấy trực tiếp từ RAM, không cần I/O hay stream
			string templateContent = _templateCache.Value;

			string htmlBody = templateContent
				.Replace("{{UserName}}", safeUserName)
				.Replace("{{OtpCode}}", safeOtpCode);

			await SendEmailAsync(to, "Mã OTP khôi phục mật khẩu - Ctrl Shift N", htmlBody);
		}
	}
}