using System;
using System.Threading.Tasks;

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
            int statusCode = 500,
            string? userId = null,
            string? ipAddress = null,
            string? userAgent = null,
            string? customMessage = null,
            string logLevel = "Error");
    }
}
