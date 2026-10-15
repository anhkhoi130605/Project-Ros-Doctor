using System.Threading.Tasks;
using API.Hubs;
using Application.Interfaces.Realtime;
using Microsoft.AspNetCore.SignalR;

namespace API.Services
{
    public static class ChatEventNames
    {
        public const string ReceiveRoleMessage = "ReceiveRoleMessage";
        public const string ReceiveUserMessage = "ReceiveUserMessage";
    }

    /// <summary>
    /// Implementation của IChatRealtimeNotifier sử dụng ASP.NET Core SignalR IHubContext
    /// Tách rời phụ thuộc SignalR khỏi tầng Application theo nguyên tắc Clean Architecture (Dependency Inversion).
    /// </summary>
    public class ChatRealtimeNotifier : IChatRealtimeNotifier
    {
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatRealtimeNotifier(IHubContext<ChatHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendMessageToRoleAsync(string targetRole, object messagePayload)
        {
            if (messagePayload is Application.Features.Chat.DTOs.ChatMessageDto dto)
            {
                var payload = new
                {
                    id = dto.Id,
                    role = dto.TargetRole,
                    sender = dto.SenderName,
                    senderEmail = dto.SenderEmail,
                    senderRole = dto.SenderRole,
                    content = dto.Content,
                    time = dto.CreatedAt.ToLocalTime().ToString("HH:mm"),
                    timestamp = dto.CreatedAt.ToString("o"),
                    rawTime = new System.DateTimeOffset(dto.CreatedAt).ToUnixTimeMilliseconds(),
                    mediaUrls = dto.MediaUrls,
                    status = dto.Status
                };
                await _hubContext.Clients.Group(targetRole).SendAsync(ChatEventNames.ReceiveRoleMessage, payload);
            }
            else
            {
                await _hubContext.Clients.Group(targetRole).SendAsync(ChatEventNames.ReceiveRoleMessage, messagePayload);
            }
        }

        public async Task SendMessageToUserAsync(string userId, object messagePayload)
        {
            await _hubContext.Clients.User(userId).SendAsync(ChatEventNames.ReceiveUserMessage, messagePayload);
        }
    }
}
