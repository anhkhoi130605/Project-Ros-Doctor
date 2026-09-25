using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using API.Middlewares.Extentions;
using Application.Features.SystemModule.Notification;
using Application.Interfaces.Logging;
using Application.Interfaces.Notifications;
using Domain.Enums;

namespace API.Controller.Common
{
    /// <summary>
    /// Base Controller cung cấp Logging và Notification cho tất cả các controller con,
    /// không cần inject qua constructor.
    /// </summary>
    [ApiController]
    public class BaseController : ControllerBase
    {
        private IUserActivityLogService? _userActivityLogService;
        private INotificationService? _notificationService;

        protected string? CurrentUserId => User.GetUserId();

        // Lazy properties — resolve từ DI container khi cần, tránh inject thừa ở từng controller con
        protected IUserActivityLogService UserActivityLogService =>
            _userActivityLogService ??= HttpContext.RequestServices.GetRequiredService<IUserActivityLogService>();


        protected INotificationService NotificationService =>
            _notificationService ??= HttpContext.RequestServices.GetRequiredService<INotificationService>();

        #region Global Unified Helpers (Activity Log + Toast + Notification)

        /// <summary>
        /// Xử lý thành công: ghi log hoạt động và gửi thông báo cho người dùng hiện tại.
        /// </summary>
        protected async Task ExecuteSuccessAsync(
            string message,
            UserActionType actionType,
            string? targetId = null,
            TargetType targetType = TargetType.None,
            string? notifyRecipient = null)
        {
            await LogUserActivity(actionType, targetId, targetType, message);

            var recipient = notifyRecipient ?? CurrentUserId;
            if (!string.IsNullOrEmpty(recipient))
            {
                await SendSystemNotification(recipient, message);
            }
        }

        /// <summary>
        /// Xử lý lỗi: ghi log exception vào hệ thống.
        /// </summary>
        protected async Task ExecuteErrorAsync(Exception ex, string? customMessage = null)
        {
            await LogSystemError(ex, customMessage);
        }

        #endregion

        #region Logging Helpers

        /// <summary>
        /// Ghi lại hành động của người dùng (vd: tạo event, cập nhật profile).
        /// </summary>
        protected async Task LogUserActivity(
            UserActionType actionType,
            string? targetId = null,
            TargetType targetType = TargetType.None,
            string? description = null)
        {
            if (string.IsNullOrEmpty(CurrentUserId)) return;
            await UserActivityLogService.LogActivityAsync(CurrentUserId, actionType, targetId, targetType, description);
        }

        /// <summary>
        /// Ghi lại lỗi hệ thống với thông tin người dùng hiện tại nếu có.
        /// </summary>
        protected Task LogSystemError(Exception ex, string? customMessage = null)
        {
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<BaseController>>();
            logger.LogError(ex, "System error for user {UserId}: {CustomMessage}", CurrentUserId, customMessage ?? ex.Message);
            return Task.CompletedTask;
        }

        /// <summary>
        /// Gửi thông báo persistent vào DB và real-time.
        /// </summary>
        protected async Task SendSystemNotification(
            string userId,
            string message,
            NotificationType type = NotificationType.SystemBroadcast,
            string? relatedId = null)
        {
            await NotificationService.SendNotificationAsync(new SendNotificationRequest
            {
                ReceiverId = userId,
                Title = "Hệ thống thông báo",
                Message = message,
                Type = type,
                RelatedEntityId = relatedId
            });
        }

        #endregion
    }
}
