using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.AboutUser;
using Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Logging
{
    public class UserActivityLogService : IUserActivityLogService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<UserActivityLogService> _logger;

        public UserActivityLogService(IUnitOfWork unitOfWork, ILogger<UserActivityLogService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task LogActivityAsync(
            string userId,
            UserActionType actionType,
            string? targetId = null,
            TargetType targetType = TargetType.None,
            string? description = null,
            string? requestPath = null,
            string? httpMethod = null,
            string? ipAddress = null,
            string? userAgent = null)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return;
            }

            var user = await _unitOfWork.User.GetByIdAsync(userId);

            var log = new UserActivityLog
            {
                UserId = userId,
                UserName = user?.FullName,
                Email = user?.Email,
                Action = actionType.ToString(),
                EntityType = targetType.ToString(),
                EntityId = targetId,
                RequestPath = requestPath ?? description,
                HttpMethod = httpMethod,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                StatusSystemResponse = SystemLog.SystemLogStatusEnum.Success,
            };

            await _unitOfWork.UserActivityLogs.CreateAsync(log);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation(
                "UserActivity | UserId={UserId} Action={Action} TargetType={TargetType} TargetId={TargetId} Description={Description} Path={RequestPath}",
                userId, actionType, targetType, targetId, description, requestPath);
        }
    }
}
