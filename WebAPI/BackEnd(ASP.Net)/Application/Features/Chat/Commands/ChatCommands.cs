using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Chat.DTOs;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Realtime;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using Domain.Entities.System;
using MediatR;

namespace Application.Features.Chat.Commands
{
    public record SendChatMessageCommand(
        string TargetRole,
        string Content,
        List<string>? MediaUrls,
        string SenderId,
        string SenderName,
        string SenderEmail,
        string SenderRole
    ) : IRequest<ChatMessageDto>;

    public class SendChatMessageCommandHandler : IRequestHandler<SendChatMessageCommand, ChatMessageDto>
    {
        private readonly IChatMessageRepository _chatMessageRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IChatRealtimeNotifier _realtimeNotifier;

        public SendChatMessageCommandHandler(
            IChatMessageRepository chatMessageRepository,
            IUnitOfWork unitOfWork,
            IChatRealtimeNotifier realtimeNotifier)
        {
            _chatMessageRepository = chatMessageRepository;
            _unitOfWork = unitOfWork;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<ChatMessageDto> Handle(SendChatMessageCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.TargetRole))
                throw new ArgumentException("TargetRole không được để trống.");

            if (string.IsNullOrWhiteSpace(request.Content) && (request.MediaUrls == null || request.MediaUrls.Count == 0))
                throw new ArgumentException("Tin nhắn phải có nội dung hoặc file đính kèm.");

            var conversationId = $"conv_role_{request.TargetRole.ToLower()}";

            // 1. Lưu tin nhắn vào MongoDB (NoSQL)
            var doc = new ChatMessageDocument
            {
                ConversationId = conversationId,
                TargetRole = request.TargetRole,
                SenderId = request.SenderId,
                SenderName = request.SenderName,
                SenderEmail = request.SenderEmail,
                SenderRole = request.SenderRole,
                Content = request.Content ?? "",
                MediaUrls = request.MediaUrls ?? new List<string>(),
                Status = "sent",
                CreatedAt = DateTime.UtcNow
            };

            await _chatMessageRepository.CreateMessageAsync(doc, cancellationToken);

            // 2. Cập nhật Metadata cuộc hội thoại trong MySQL (RDBMS)
            try
            {
                var conversations = await _unitOfWork.ChatConversations.GetAllAsync(c => c.TargetRole == request.TargetRole, null, cancellationToken);
                var conv = conversations?.FirstOrDefault();

                if (conv == null)
                {
                    conv = new ChatConversation
                    {
                        Id = conversationId,
                        Title = $"Kênh {request.TargetRole}",
                        Type = "Role",
                        TargetRole = request.TargetRole,
                        LastMessageContent = request.Content?.Length > 100 ? request.Content.Substring(0, 97) + "..." : request.Content,
                        LastMessageAt = doc.CreatedAt,
                        LastSenderName = request.SenderName,
                        IsActive = true
                    };
                    await _unitOfWork.ChatConversations.CreateAsync(conv, cancellationToken);
                }
                else
                {
                    conv.LastMessageContent = request.Content?.Length > 100 ? request.Content.Substring(0, 97) + "..." : request.Content;
                    conv.LastMessageAt = doc.CreatedAt;
                    conv.LastSenderName = request.SenderName;
                    await _unitOfWork.ChatConversations.UpdateAsync(conv, cancellationToken);
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // MongoDB là source of truth cho lịch sử tin nhắn; không làm gián đoạn nếu cập nhật metadata gặp sự cố
            }

            var dto = new ChatMessageDto
            {
                Id = doc.Id ?? string.Empty,
                ConversationId = doc.ConversationId,
                TargetRole = doc.TargetRole ?? string.Empty,
                SenderId = doc.SenderId,
                SenderName = doc.SenderName,
                SenderEmail = doc.SenderEmail ?? string.Empty,
                SenderRole = doc.SenderRole,
                Content = doc.Content,
                MediaUrls = doc.MediaUrls,
                Status = doc.Status,
                Reactions = doc.Reactions,
                CreatedAt = doc.CreatedAt,
                IsMe = true
            };

            // 3. Đẩy tin nhắn qua Realtime Notifier (Output Port)
            try
            {
                await _realtimeNotifier.SendMessageToRoleAsync(request.TargetRole, dto);
            }
            catch
            {
                // Không crash nếu client realtime tạm thời mất kết nối
            }

            return dto;
        }
    }

    public record SaveUserChatHistoryCommand(
        string? CurrentUserId,
        string? CurrentUserEmail,
        string? ClientUserKey,
        string ConversationsJson
    ) : IRequest<string>;

    public class SaveUserChatHistoryCommandHandler : IRequestHandler<SaveUserChatHistoryCommand, string>
    {
        private readonly IChatMessageRepository _chatMessageRepository;

        public SaveUserChatHistoryCommandHandler(IChatMessageRepository chatMessageRepository)
        {
            _chatMessageRepository = chatMessageRepository;
        }

        public async Task<string> Handle(SaveUserChatHistoryCommand request, CancellationToken cancellationToken)
        {
            var keys = ChatHistoryJsonHelper.BuildUserKeys(request.CurrentUserId, request.CurrentUserEmail, request.ClientUserKey);
            if (keys.Count == 0)
            {
                return "[]";
            }

            var existingJsonList = await _chatMessageRepository.GetUserChatHistoryJsonListAsync(keys, cancellationToken);
            var sources = new List<string?>(existingJsonList ?? new List<string>()) { request.ConversationsJson };
            var mergedJson = ChatHistoryJsonHelper.MergeConversationsJson(sources);

            var primaryKey = !string.IsNullOrWhiteSpace(request.CurrentUserId)
                ? request.CurrentUserId.Trim().ToLowerInvariant()
                : keys[0];

            await _chatMessageRepository.SaveUserChatHistoryJsonAsync(
                primaryKey,
                request.CurrentUserEmail,
                keys,
                mergedJson,
                cancellationToken);

            return mergedJson;
        }
    }
}
