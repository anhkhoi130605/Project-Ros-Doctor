using Microsoft.Extensions.Logging;
using Application.Interfaces.Logging;

namespace Infrastructure.Services.Logging
{
    public class SystemErrorLogService : ISystemErrorLogService
    {
        private readonly ILogger<SystemErrorLogService> _logger;

        public SystemErrorLogService(ILogger<SystemErrorLogService> logger)
        {
            _logger = logger;
        }

        public Task LogErrorAsync(Exception ex, string? customMessage = null, string? userId = null)
        {
            _logger.LogError(ex,
                "SystemError | UserId={UserId} Message={CustomMessage}",
                userId ?? "anonymous", customMessage ?? ex.Message);

            return Task.CompletedTask;
        }
    }
}
