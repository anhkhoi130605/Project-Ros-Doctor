using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.AboutUser;
using Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Logging
{
    public class UserActivityLogService : IUserActivityLogService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<UserActivityLogService> _logger;

        public UserActivityLogService(IServiceScopeFactory scopeFactory, ILogger<UserActivityLogService> logger)
        {
            _scopeFactory = scopeFactory;
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

            // Persist to database in background to avoid blocking the HTTP response
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                    string? userName = request.UserName;
                    string? email = request.Email;

                    if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(email))
                    {
                        var user = await unitOfWork.User.GetByIdAsync(request.UserId);
                        userName ??= user?.FullName;
                        email ??= user?.Email;
                    }

                    var log = new UserActivityLog
                    {
                        UserId = request.UserId,
                        UserName = userName,
                        Email = email,
                        Action = request.ActionType.ToString(),
                        EntityType = request.TargetType.ToString(),
                        EntityId = request.TargetId,
                        RequestPath = request.RequestPath ?? request.Description,
                        HttpMethod = request.HttpMethod,
                        IpAddress = request.IpAddress,
                        UserAgent = request.UserAgent,
                        StatusSystemResponse = SystemLog.SystemLogStatusEnum.Success,
                    };

                    await unitOfWork.UserActivityLogs.CreateAsync(log);
                    await unitOfWork.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to persist user activity log for user {UserId}", request.UserId);
                }
            });

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
                userId,
                actionType,
                targetId,
                targetType,
                description,
                requestPath,
                httpMethod,
                ipAddress,
                userAgent,
                userName,
                email));
        }
    }
}
