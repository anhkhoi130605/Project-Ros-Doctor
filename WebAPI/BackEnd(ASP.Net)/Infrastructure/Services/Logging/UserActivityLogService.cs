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

        public async Task LogActivityAsync(LogActivityRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UserId))
            {
                return;
            }

            var user = await _unitOfWork.User.GetByIdAsync(request.UserId);

            var log = new UserActivityLog
            {
                UserId = request.UserId,
                UserName = user?.FullName,
                Email = user?.Email,
                Action = request.ActionType.ToString(),
                EntityType = request.TargetType.ToString(),
                EntityId = request.TargetId,
                RequestPath = request.RequestPath ?? request.Description,
                HttpMethod = request.HttpMethod,
                IpAddress = request.IpAddress,
                UserAgent = request.UserAgent,
                StatusSystemResponse = SystemLog.SystemLogStatusEnum.Success,
            };

            await _unitOfWork.UserActivityLogs.CreateAsync(log);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation(
                "UserActivity | UserId={UserId} Action={Action} TargetType={TargetType} TargetId={TargetId} Description={Description} Path={RequestPath}",
                request.UserId, request.ActionType, request.TargetType, request.TargetId, request.Description, request.RequestPath);
        }

        public Task LogActivityAsync(
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
            return LogActivityAsync(new LogActivityRequest(
                userId,
                actionType,
                targetId,
                targetType,
                description,
                requestPath,
                httpMethod,
                ipAddress,
                userAgent));
        }
    }
}
