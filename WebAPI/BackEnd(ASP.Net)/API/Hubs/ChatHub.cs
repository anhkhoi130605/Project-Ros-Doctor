using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Notifications;

namespace API.Hubs
{
    public class ChatHub : Hub
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(IUnitOfWork unitOfWork, ILogger<ChatHub> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task JoinRoleGroup(string role)
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, role);
                _logger.LogInformation("Connection {ConnectionId} joined role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task LeaveRoleGroup(string role)
        {
            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
                _logger.LogInformation("Connection {ConnectionId} left role group: {Role}", Context.ConnectionId, role);
            }
        }

        public async Task SendMessageToRole(string targetRole, string content, string senderName, string senderEmail, string senderRole)
        {
            if (string.IsNullOrWhiteSpace(targetRole) || string.IsNullOrWhiteSpace(content))
                return;

            var nowUtc = DateTime.UtcNow;
            var timeFormatted = DateTime.Now.ToString("HH:mm");
            var messageId = $"msg_{Guid.NewGuid():N}";

            var messagePayload = new
            {
                id = messageId,
                role = targetRole,
                content = content.Trim(),
                sender = string.IsNullOrWhiteSpace(senderName) ? "Thành viên hệ thống" : senderName,
                senderEmail = senderEmail ?? string.Empty,
                senderRole = senderRole ?? "User",
                time = timeFormatted,
                timestamp = nowUtc.ToString("o"),
                rawTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };

            // 1. Lưu tin nhắn vào Database (Bảng Notifications)
            try
            {
                var notification = new Notification
                {
                    Title = messagePayload.sender,
                    Message = messagePayload.content,
                    Type = "RoleMessage",
                    RelatedEntityId = targetRole,
                    IsRead = false,
                    CreatedAt = nowUtc
                };
                await _unitOfWork.Notifications.CreateAsync(notification);
                await _unitOfWork.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist chat message to database for role {Role}", targetRole);
            }

            // 2. Broadcast Real-time qua SignalR tới targetRole
            await Clients.Group(targetRole).SendAsync("ReceiveRoleMessage", messagePayload);

            // Gửi cả tới nhóm của sender nếu khác targetRole
            if (!string.IsNullOrWhiteSpace(senderRole) && !string.Equals(senderRole, targetRole, StringComparison.OrdinalIgnoreCase))
            {
                await Clients.Group(senderRole).SendAsync("ReceiveRoleMessage", messagePayload);
            }

            // Gửi xác nhận cho chính kết nối gọi
            await Clients.Caller.SendAsync("ReceiveRoleMessage", messagePayload);
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
