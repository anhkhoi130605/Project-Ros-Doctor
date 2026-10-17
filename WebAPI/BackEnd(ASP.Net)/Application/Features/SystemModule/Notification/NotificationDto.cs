using System;

namespace Application.Features.SystemModule.Notification
{
    public class NotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? Message { get; set; }
        public bool IsRead { get; set; }
        public string? Type { get; set; }
        public string? RelatedEntityId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? ReceiverId { get; set; }
    }
}
