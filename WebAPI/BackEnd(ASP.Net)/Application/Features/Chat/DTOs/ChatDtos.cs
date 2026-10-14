using System;
using System.Collections.Generic;

namespace Application.Features.Chat.DTOs
{
    public class ChatMemberDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string Status { get; set; } = "Active";
        public bool IsOnline { get; set; } = true;
    }

    public class ChatRoleDto
    {
        public string Id { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public string AvatarText { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool Online { get; set; } = true;
        public int MemberCount { get; set; }
        public List<ChatMemberDto> Members { get; set; } = new();
        public string LastMessage { get; set; } = string.Empty;
        public string LastTime { get; set; } = string.Empty;
        public long RawTime { get; set; }
        public bool Unread { get; set; }
    }

    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string ConversationId { get; set; } = string.Empty;
        public string TargetRole { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string> MediaUrls { get; set; } = new();
        public string Status { get; set; } = "sent";
        public Dictionary<string, string> Reactions { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public bool IsMe { get; set; }
    }

    public class SendChatMessageRequestDto
    {
        public string TargetRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string>? MediaUrls { get; set; }
    }
}
