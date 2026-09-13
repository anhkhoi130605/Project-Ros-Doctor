using Microsoft.Extensions.Logging;
using Application.Interfaces.Logging;
using Domain.Enums;

namespace Infrastructure.Services.Logging
{
    public class UserActivityLogService : IUserActivityLogService
    {
        private readonly ILogger<UserActivityLogService> _logger;

        public UserActivityLogService(ILogger<UserActivityLogService> logger)
        {
            _logger = logger;
        }

        public Task LogActivityAsync(
            string userId,
            UserActionType actionType,
            string? targetId = null,
            TargetType targetType = TargetType.None,
            string? description = null)
        {
            _logger.LogInformation(
                "UserActivity | UserId={UserId} Action={Action} TargetType={TargetType} TargetId={TargetId} Description={Description}",
                userId, actionType, targetType, targetId, description);

            return Task.CompletedTask;
        }
    }
}
