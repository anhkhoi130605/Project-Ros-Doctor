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
    }
}
