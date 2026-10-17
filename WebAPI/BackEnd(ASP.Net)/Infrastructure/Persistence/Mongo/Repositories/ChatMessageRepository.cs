using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo.Repositories
{
    public class ChatMessageRepository : IChatMessageRepository
    {
        private const string AiChatHistoryRole = "__AI_CHAT_HISTORY__";
        private static readonly ConcurrentDictionary<string, string> _memoryHistoryFallback = new(StringComparer.OrdinalIgnoreCase);
        private readonly IMongoDbContext _context;

        public ChatMessageRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<ChatMessageDocument> CreateMessageAsync(ChatMessageDocument document, CancellationToken cancellationToken = default)
        {
            try
            {
                if (_context.ChatMessages != null)
                {
                    await _context.ChatMessages.InsertOneAsync(document, cancellationToken: cancellationToken);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error inserting message to MongoDB: {ex.Message}");
            }
            return document;
        }

        public async Task<List<ChatMessageDocument>> GetMessagesByConversationAsync(string conversationId, int limit = 50, CancellationToken cancellationToken = default)
        {
            try
            {
                if (_context.ChatMessages == null) return new List<ChatMessageDocument>();

                var filter = Builders<ChatMessageDocument>.Filter.Eq(x => x.ConversationId, conversationId);
                return await _context.ChatMessages
                    .Find(filter)
                    .SortBy(x => x.CreatedAt)
                    .Limit(limit)
                    .ToListAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error querying conversation messages: {ex.Message}");
                return new List<ChatMessageDocument>();
            }
        }

        public async Task<List<ChatMessageDocument>> GetMessagesByRoleAsync(string role, int limit = 50, CancellationToken cancellationToken = default)
        {
            try
            {
                if (_context.ChatMessages == null) return new List<ChatMessageDocument>();

                var filter = Builders<ChatMessageDocument>.Filter.Eq(x => x.TargetRole, role);
                return await _context.ChatMessages
                    .Find(filter)
                    .SortBy(x => x.CreatedAt)
                    .Limit(limit)
                    .ToListAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error querying role messages: {ex.Message}");
                return new List<ChatMessageDocument>();
            }
        }

        public async Task<ChatMessageDocument?> GetLatestMessageByRoleAsync(string role, CancellationToken cancellationToken = default)
        {
            try
            {
                if (_context.ChatMessages == null) return null;

                var filter = Builders<ChatMessageDocument>.Filter.Eq(x => x.TargetRole, role);
                return await _context.ChatMessages
                    .Find(filter)
                    .SortByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error querying latest message for role: {ex.Message}");
                return null;
            }
        }

        public async Task<List<string>> GetUserChatHistoryJsonListAsync(IReadOnlyCollection<string> userKeys, CancellationToken cancellationToken = default)
        {
            var results = new List<string>();
            var normalizedKeys = NormalizeKeys(userKeys);
            if (normalizedKeys.Count == 0) return results;

            foreach (var key in normalizedKeys)
            {
                if (_memoryHistoryFallback.TryGetValue(key, out var cachedJson) && !string.IsNullOrWhiteSpace(cachedJson))
                {
                    results.Add(cachedJson);
                }
            }

            try
            {
                if (_context.ChatMessages != null)
                {
                    var convIds = normalizedKeys.Select(k => $"ai_history_{k}").ToList();
                    var filter = Builders<ChatMessageDocument>.Filter.And(
                        Builders<ChatMessageDocument>.Filter.Eq(x => x.TargetRole, AiChatHistoryRole),
                        Builders<ChatMessageDocument>.Filter.Or(
                            Builders<ChatMessageDocument>.Filter.In(x => x.SenderId, normalizedKeys),
                            Builders<ChatMessageDocument>.Filter.In(x => x.SenderEmail, normalizedKeys),
                            Builders<ChatMessageDocument>.Filter.In(x => x.ConversationId, convIds)
                        )
                    );

                    var docs = await _context.ChatMessages
                        .Find(filter)
                        .SortByDescending(x => x.CreatedAt)
                        .Limit(10)
                        .ToListAsync(cancellationToken);

                    foreach (var doc in docs)
                    {
                        if (!string.IsNullOrWhiteSpace(doc.Content))
                        {
                            results.Add(doc.Content);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error querying AI chat history: {ex.Message}");
            }

            return results;
        }

        public async Task SaveUserChatHistoryJsonAsync(
            string primaryUserId,
            string? userEmail,
            IReadOnlyCollection<string> userKeys,
            string conversationsJson,
            CancellationToken cancellationToken = default)
        {
            var normalizedKeys = NormalizeKeys(userKeys);
            var normalizedPrimary = !string.IsNullOrWhiteSpace(primaryUserId)
                ? primaryUserId.Trim().ToLowerInvariant()
                : normalizedKeys.FirstOrDefault() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(normalizedPrimary)) return;

            var normalizedEmail = !string.IsNullOrWhiteSpace(userEmail)
                ? userEmail.Trim().ToLowerInvariant()
                : string.Empty;

            if (!normalizedKeys.Contains(normalizedPrimary))
                normalizedKeys.Add(normalizedPrimary);
            if (!string.IsNullOrWhiteSpace(normalizedEmail) && !normalizedKeys.Contains(normalizedEmail))
                normalizedKeys.Add(normalizedEmail);

            foreach (var key in normalizedKeys)
            {
                _memoryHistoryFallback[key] = conversationsJson;
            }

            try
            {
                if (_context.ChatMessages != null)
                {
                    var convIds = normalizedKeys.Select(k => $"ai_history_{k}").ToList();
                    var filter = Builders<ChatMessageDocument>.Filter.And(
                        Builders<ChatMessageDocument>.Filter.Eq(x => x.TargetRole, AiChatHistoryRole),
                        Builders<ChatMessageDocument>.Filter.Or(
                            Builders<ChatMessageDocument>.Filter.In(x => x.SenderId, normalizedKeys),
                            Builders<ChatMessageDocument>.Filter.In(x => x.SenderEmail, normalizedKeys),
                            Builders<ChatMessageDocument>.Filter.In(x => x.ConversationId, convIds)
                        )
                    );

                    var existingDocs = await _context.ChatMessages
                        .Find(filter)
                        .SortByDescending(x => x.CreatedAt)
                        .ToListAsync(cancellationToken);

                    var primaryConvId = $"ai_history_{normalizedPrimary}";
                    if (existingDocs.Count > 0)
                    {
                        var primaryDoc = existingDocs[0];
                        var update = Builders<ChatMessageDocument>.Update
                            .Set(x => x.ConversationId, primaryConvId)
                            .Set(x => x.TargetRole, AiChatHistoryRole)
                            .Set(x => x.SenderId, normalizedPrimary)
                            .Set(x => x.SenderEmail, normalizedEmail)
                            .Set(x => x.Content, conversationsJson)
                            .Set(x => x.CreatedAt, DateTime.UtcNow);

                        await _context.ChatMessages.UpdateOneAsync(
                            Builders<ChatMessageDocument>.Filter.Eq(x => x.Id, primaryDoc.Id),
                            update,
                            cancellationToken: cancellationToken);

                        if (existingDocs.Count > 1)
                        {
                            var duplicateIds = existingDocs.Skip(1).Where(d => !string.IsNullOrEmpty(d.Id)).Select(d => d.Id).ToList();
                            if (duplicateIds.Count > 0)
                            {
                                await _context.ChatMessages.DeleteManyAsync(
                                    Builders<ChatMessageDocument>.Filter.In(x => x.Id, duplicateIds),
                                    cancellationToken);
                            }
                        }
                    }
                    else
                    {
                        var doc = new ChatMessageDocument
                        {
                            ConversationId = primaryConvId,
                            TargetRole = AiChatHistoryRole,
                            SenderId = normalizedPrimary,
                            SenderName = normalizedPrimary,
                            SenderEmail = normalizedEmail,
                            SenderRole = "User",
                            Content = conversationsJson,
                            Status = "saved",
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.ChatMessages.InsertOneAsync(doc, cancellationToken: cancellationToken);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatMessageRepository] Error saving AI chat history: {ex.Message}");
            }
        }

        private static List<string> NormalizeKeys(IReadOnlyCollection<string>? keys)
        {
            if (keys == null) return new List<string>();
            return keys
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .Select(k => k.Trim().ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
