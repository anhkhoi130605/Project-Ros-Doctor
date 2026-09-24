using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Reflection;
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

            string templateContent = LoadEmbeddedEmailTemplate("Infrastructure.Templates.OtpEmailTemplate.html");
            string htmlBody = templateContent
                .Replace("{{UserName}}", safeUserName)
                .Replace("{{OtpCode}}", safeOtpCode);

            await SendEmailAsync(to, "Mã OTP khôi phục mật khẩu - Ctrl Shift N", htmlBody);
        }

        private static string LoadEmbeddedEmailTemplate(string resourceName)
        {
            var assembly = typeof(SmtpEmailService).Assembly;
            using var stream = assembly.GetManifestResourceStream(resourceName);

            if (stream == null)
            {
                throw new InvalidOperationException($"Không tìm thấy template nhúng (Embedded Resource): '{resourceName}'.");
            }

            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
    }
}
