using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities.NoSql;

namespace Application.Interfaces.Repositories
{
    /// <summary>
    /// Giao diện Repository lưu trữ và truy vấn tin nhắn trong MongoDB (NoSQL)
    /// </summary>
    public interface IChatMessageRepository
    {
        Task<ChatMessageDocument> CreateMessageAsync(ChatMessageDocument document, CancellationToken cancellationToken = default);
        Task<List<ChatMessageDocument>> GetMessagesByConversationAsync(string conversationId, int limit = 50, CancellationToken cancellationToken = default);
        Task<List<ChatMessageDocument>> GetMessagesByRoleAsync(string role, int limit = 50, CancellationToken cancellationToken = default);
        Task<ChatMessageDocument?> GetLatestMessageByRoleAsync(string role, CancellationToken cancellationToken = default);
        Task<List<string>> GetUserChatHistoryJsonListAsync(IReadOnlyCollection<string> userKeys, CancellationToken cancellationToken = default);
        Task SaveUserChatHistoryJsonAsync(string primaryUserId, string? userEmail, IReadOnlyCollection<string> userKeys, string conversationsJson, CancellationToken cancellationToken = default);
    }
}
