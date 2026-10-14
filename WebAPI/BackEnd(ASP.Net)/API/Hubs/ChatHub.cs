using System;
using System.Threading.Tasks;
using Application.Features.Chat.Commands;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace API.Hubs
{
    /// <summary>
    /// Presentation Interface Adapter (WebSocket SignalR Hub) theo Clean Architecture.
    /// Hub chỉ làm nhiệm vụ quản lý kết nối, nhóm phòng và điều phối Command vào Use Cases qua MediatR.
    /// </summary>
    public class ChatHub : Hub
    {
        private readonly IMediator _mediator;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(
            IMediator mediator,
            ILogger<ChatHub> logger)
        {
            _mediator = mediator;
            _logger = logger;
        }

        public async Task JoinRoleGroup(string role)
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, role);
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{role}");
                _logger.LogInformation("SignalR Connection {ConnectionId} joined role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task LeaveRoleGroup(string role)
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Role_{role}");
                _logger.LogInformation("SignalR Connection {ConnectionId} left role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task SendMessageToRole(string targetRole, string content, string senderName, string senderEmail, string senderRole)
        {
            if (string.IsNullOrWhiteSpace(targetRole) || string.IsNullOrWhiteSpace(content))
                return;

            try
            {
                var command = new SendChatMessageCommand(
                    TargetRole: targetRole,
                    Content: content.Trim(),
                    MediaUrls: null,
                    SenderId: senderEmail ?? Context.ConnectionId,
                    SenderName: string.IsNullOrWhiteSpace(senderName) ? "Thành viên hệ thống" : senderName,
                    SenderEmail: senderEmail ?? string.Empty,
                    SenderRole: senderRole ?? "User"
                );

                await _mediator.Send(command);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi điều phối tin nhắn qua MediatR Use Case cho role {Role}", targetRole);
            }
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("SignalR Chat Client connected: {ConnectionId}", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("SignalR Chat Client disconnected: {ConnectionId}", Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }
    }
}
