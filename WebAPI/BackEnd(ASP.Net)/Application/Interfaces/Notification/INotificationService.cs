using Application.Features.SystemModule.Notification;
using Domain.Enums;

namespace Application.Interfaces.Notifications
{
    /// <summary>
    /// Gửi thông báo persistent vào Database và real-time (SignalR/...) cho người dùng.
    /// </summary>
    public interface INotificationService
    {
        Task SendNotificationAsync(SendNotificationRequest request);
        Task<List<NotificationDto>> GetNotificationsForUserAsync(string userId, string? role, int take = 50);
        Task<bool> MarkAsReadAsync(string notificationId, string userId);
        Task<bool> MarkAllAsReadAsync(string userId);
    }

}
