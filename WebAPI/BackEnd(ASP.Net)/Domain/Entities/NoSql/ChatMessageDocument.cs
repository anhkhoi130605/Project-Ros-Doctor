using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
    /// <summary>
    /// Lưu trữ toàn bộ lịch sử tin nhắn trong MongoDB (NoSQL)
    /// Tối ưu hoá cho ghi tuần tự cực nhanh (Write-heavy) và truy vấn theo dải thời gian (Time-series query).
    /// </summary>
    [BsonIgnoreExtraElements]
    public class ChatMessageDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("conversation_id")]
        public string ConversationId { get; set; } = string.Empty;

        [BsonElement("target_role")]
        public string? TargetRole { get; set; }

        [BsonElement("sender_id")]
        public string SenderId { get; set; } = string.Empty;

        [BsonElement("sender_name")]
        public string SenderName { get; set; } = string.Empty;

        [BsonElement("sender_email")]
        public string? SenderEmail { get; set; }

        [BsonElement("sender_role")]
        public string SenderRole { get; set; } = "User";

        [BsonElement("sender_avatar")]
        public string? SenderAvatar { get; set; }

        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("media_urls")]
        public List<string> MediaUrls { get; set; } = new();

        [BsonElement("status")]
        public string Status { get; set; } = "sent"; // sent, delivered, seen

        [BsonElement("reactions")]
        public Dictionary<string, string> Reactions { get; set; } = new();

        [BsonElement("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
