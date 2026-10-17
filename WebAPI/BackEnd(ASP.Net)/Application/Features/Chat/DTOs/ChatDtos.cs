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

    public static class ChatHistoryJsonHelper
    {
        public const int HistoryLimit = 50;

        public static List<string> BuildUserKeys(params string?[] rawKeys)
        {
            var list = new List<string>();
            if (rawKeys == null) return list;
            foreach (var key in rawKeys)
            {
                if (!string.IsNullOrWhiteSpace(key))
                {
                    var normalized = key.Trim().ToLowerInvariant();
                    if (!list.Contains(normalized))
                    {
                        list.Add(normalized);
                    }
                }
            }
            return list;
        }

        public static string MergeConversationsJson(IEnumerable<string?> jsonSources)
        {
            var byId = new Dictionary<string, (System.Text.Json.Nodes.JsonObject Node, DateTimeOffset UpdatedAt, int MessageCount)>(StringComparer.Ordinal);

            foreach (var rawJson in jsonSources)
            {
                if (string.IsNullOrWhiteSpace(rawJson)) continue;
                try
                {
                    var parsed = System.Text.Json.Nodes.JsonNode.Parse(rawJson) as System.Text.Json.Nodes.JsonArray;
                    if (parsed == null) continue;

                    foreach (var element in parsed)
                    {
                        if (element is not System.Text.Json.Nodes.JsonObject item) continue;

                        var id = item["id"]?.GetValue<string>();
                        var updatedAtStr = item["updatedAt"]?.GetValue<string>();
                        var bagId = item["bagId"]?.GetValue<string>();
                        var sessionId = item["sessionId"]?.GetValue<string>();
                        var messages = item["messages"] as System.Text.Json.Nodes.JsonArray;

                        if (string.IsNullOrWhiteSpace(id)
                            || string.IsNullOrWhiteSpace(updatedAtStr)
                            || !DateTimeOffset.TryParse(updatedAtStr, out var updatedAt)
                            || bagId == null
                            || sessionId == null
                            || messages == null)
                        {
                            continue;
                        }

                        string? firstUserQuestion = null;
                        var validMessages = true;
                        foreach (var msgNode in messages)
                        {
                            if (msgNode is not System.Text.Json.Nodes.JsonObject msgObj)
                            {
                                validMessages = false;
                                break;
                            }
                            var sender = msgObj["sender"]?.GetValue<string>();
                            var text = msgObj["text"]?.GetValue<string>();
                            if (text == null || (sender != "user" && sender != "agent"))
                            {
                                validMessages = false;
                                break;
                            }
                            if (sender == "user" && firstUserQuestion == null && !string.IsNullOrWhiteSpace(text))
                            {
                                firstUserQuestion = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();
                                if (firstUserQuestion.Length > 80)
                                    firstUserQuestion = firstUserQuestion.Substring(0, 80);
                            }
                            if (msgObj["isStreaming"] is System.Text.Json.Nodes.JsonValue streamVal
                                && streamVal.TryGetValue<bool>(out var isStreaming)
                                && isStreaming)
                            {
                                msgObj["isStreaming"] = false;
                                msgObj["interrupted"] = true;
                            }
                        }

                        if (!validMessages || string.IsNullOrWhiteSpace(firstUserQuestion))
                            continue;

                        var cloned = item.DeepClone() as System.Text.Json.Nodes.JsonObject;
                        if (cloned == null) continue;
                        cloned["title"] = firstUserQuestion;
                        var msgCount = messages.Count;

                        if (!byId.TryGetValue(id, out var existing)
                            || updatedAt > existing.UpdatedAt
                            || (updatedAt == existing.UpdatedAt && msgCount >= existing.MessageCount))
                        {
                            byId[id] = (cloned, updatedAt, msgCount);
                        }
                    }
                }
                catch
                {
                    // Ignore malformed JSON fragments
                }
            }

            var sorted = new System.Text.Json.Nodes.JsonArray();
            foreach (var entry in byId.Values)
            {
                // Sorted insertion below
            }

            var ordered = new List<(System.Text.Json.Nodes.JsonObject Node, DateTimeOffset UpdatedAt)>();
            foreach (var val in byId.Values)
            {
                ordered.Add((val.Node, val.UpdatedAt));
            }
            ordered.Sort((a, b) => b.UpdatedAt.CompareTo(a.UpdatedAt));

            var count = Math.Min(ordered.Count, HistoryLimit);
            for (var i = 0; i < count; i++)
            {
                sorted.Add(ordered[i].Node);
            }

            return sorted.ToJsonString();
        }
    }
}
