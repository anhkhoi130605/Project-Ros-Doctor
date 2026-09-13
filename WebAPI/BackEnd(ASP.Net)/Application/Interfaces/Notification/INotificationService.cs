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
    }
}
