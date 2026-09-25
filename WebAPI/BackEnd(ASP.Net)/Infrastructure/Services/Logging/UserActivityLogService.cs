using Application.Interfaces.Logging;
using Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Logging
{
    public class UserActivityLogService : IUserActivityLogService
    {
        private readonly IUserActivityLogQueue _queue;
        private readonly ILogger<UserActivityLogService> _logger;

        public UserActivityLogService(
            IUserActivityLogQueue queue,
            ILogger<UserActivityLogService> logger)
        {
            _queue = queue;
            _logger = logger;
        }

        public Task LogActivityAsync(LogActivityRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UserId))
            {
                return Task.CompletedTask;
            }

            _logger.LogInformation(
                "UserActivity | UserId={UserId} Action={Action} TargetType={TargetType} TargetId={TargetId} Description={Description} Path={RequestPath}",
                request.UserId, request.ActionType, request.TargetType, request.TargetId, request.Description, request.RequestPath);

            // Ghi vào hàng đợi bất đồng bộ Channel<T>, không block HTTP request và được xử lý tuần tự/an toàn bởi BackgroundService
            _queue.EnqueueAsync(request);

            return Task.CompletedTask;
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
            string? userAgent = null,
            string? userName = null,
            string? email = null)
        {
            return LogActivityAsync(new LogActivityRequest(
                UserId: userId,
                ActionType: actionType,
                TargetId: targetId,
                TargetType: targetType,
                Description: description,
                RequestPath: requestPath,
                HttpMethod: httpMethod,
                IpAddress: ipAddress,
                UserAgent: userAgent,
                UserName: userName,
                Email: email));
        }
    }
}
