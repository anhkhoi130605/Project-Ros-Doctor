using System;
using Domain.Common;

namespace Domain.Entities.System
{
    /// <summary>
    /// Metadata cuộc trò chuyện lưu trữ trong RDBMS (MySQL)
    /// Quản lý thông tin hội thoại, phân quyền, người tạo, cấu hình và tóm tắt tin nhắn gần nhất.
    /// </summary>
    public class ChatConversation : BaseEntity
    {
        public string Title { get; set; } = string.Empty;

        public string Type { get; set; } = "Role"; // "Role", "Direct", "Group"

        public string? TargetRole { get; set; } // "Engineering", "Admin", "User"

        public string? AvatarUrl { get; set; }

        public string? CreatorId { get; set; }

        public string? LastMessageContent { get; set; }

        public DateTime? LastMessageAt { get; set; }

        public string? LastSenderName { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
