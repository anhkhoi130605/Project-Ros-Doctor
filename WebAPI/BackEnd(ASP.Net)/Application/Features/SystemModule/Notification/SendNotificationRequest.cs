using Domain.Enums;

namespace Application.Features.SystemModule.Notification
{
    public class SendNotificationRequest
    {
        public required string ReceiverId { get; set; }
        public required string Title { get; set; }
        public required string Message { get; set; }
        public NotificationType Type { get; set; } = NotificationType.SystemBroadcast;
        public string? RelatedEntityId { get; set; }
    }
}
