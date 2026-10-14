using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo.Repositories
{
    public class ChatMessageRepository : IChatMessageRepository
    {
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
    }
}
