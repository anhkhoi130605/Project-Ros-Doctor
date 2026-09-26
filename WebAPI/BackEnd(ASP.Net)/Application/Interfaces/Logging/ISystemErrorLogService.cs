using System;
using System.Net;


namespace Application.Interfaces.Logging
{
    /// <summary>
    /// Ghi lại các lỗi hệ thống (exception) phục vụ monitoring, dịch lỗi và debug.
    /// </summary>
    public interface ISystemErrorLogService
    {
        Task LogErrorAsync(
            Exception ex,
            string? requestPath = null,
            string? httpMethod = null,
			HttpStatusCode? statusCode = null,
            string? userId = null,
            string? ipAddress = null,
            string? userAgent = null,
            string? customMessage = null,
            string logLevel = "Error");
    }
}
