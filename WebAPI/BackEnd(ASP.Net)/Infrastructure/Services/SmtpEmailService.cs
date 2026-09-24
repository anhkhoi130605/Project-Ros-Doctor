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

            string templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "OtpEmailTemplate.html");
            if (!File.Exists(templatePath))
            {
                templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Infrastructure", "Templates", "OtpEmailTemplate.html");
            }

            string htmlBody;
            if (File.Exists(templatePath))
            {
                string templateContent = await File.ReadAllTextAsync(templatePath);
                htmlBody = templateContent
                    .Replace("{{UserName}}", safeUserName)
                    .Replace("{{OtpCode}}", safeOtpCode);
            }
            else
            {
                htmlBody = $"<div style='font-family: Arial, sans-serif; padding: 20px;'><p>Xin chào <strong>{safeUserName}</strong>,</p><p>Mã OTP khôi phục mật khẩu của bạn là: <strong style='font-size: 24px; color: #1c5c43;'>{safeOtpCode}</strong> (Hiệu lực 10 phút).</p></div>";
            }

            await SendEmailAsync(to, "Mã OTP khôi phục mật khẩu - Ctrl Shift N", htmlBody);
        }
    }
}
