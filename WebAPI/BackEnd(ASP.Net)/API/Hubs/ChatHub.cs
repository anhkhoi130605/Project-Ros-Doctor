using System;
using System.Security.Claims;
using System.Threading.Tasks;
using API.Middlewares.Extentions;
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
                _logger.LogInformation("SignalR Connection {ConnectionId} joined role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task LeaveRoleGroup(string role)
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
                _logger.LogInformation("SignalR Connection {ConnectionId} left role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task SendMessageToRole(string targetRole, string content, string? senderName = null, string? senderEmail = null, string? senderRole = null)
        {
            var trimmedContent = content?.Trim();
            if (string.IsNullOrWhiteSpace(targetRole) || string.IsNullOrWhiteSpace(trimmedContent))
                return;

            try
            {
                var user = Context.User;
                var claimUserId = user?.GetUserId();
                var claimEmail = user?.FindFirst(ClaimTypes.Email)?.Value;
                var claimName = user?.FindFirst(ClaimTypes.Name)?.Value;
                var claimRole = user?.GetRole();

                var resolvedSenderId = claimUserId ?? (!string.IsNullOrWhiteSpace(senderEmail) ? senderEmail : Context.ConnectionId);
                var resolvedSenderName = !string.IsNullOrWhiteSpace(claimName) ? claimName : (!string.IsNullOrWhiteSpace(senderName) ? senderName : "Thành viên hệ thống");
                var resolvedSenderEmail = !string.IsNullOrWhiteSpace(claimEmail) ? claimEmail : (senderEmail ?? string.Empty);
                var resolvedSenderRole = !string.IsNullOrWhiteSpace(claimRole) ? claimRole : (senderRole ?? "User");

                var command = new SendChatMessageCommand(
                    TargetRole: targetRole,
                    Content: trimmedContent,
                    MediaUrls: null,
                    SenderId: resolvedSenderId,
                    SenderName: resolvedSenderName,
                    SenderEmail: resolvedSenderEmail,
                    SenderRole: resolvedSenderRole
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
