using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Identity;
using Domain.Entities.Notifications;
using API.Hubs;
using static Domain.Enums.UserEnum;

namespace API.Controller.ChatController
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatController(IUnitOfWork unitOfWork, IHubContext<ChatHub> hubContext)
        {
            _unitOfWork = unitOfWork;
            _hubContext = hubContext;
        }

        /// <summary>
        /// Lấy danh sách Roles và các thành viên thực tế từ Database
        /// </summary>
        [HttpGet("roles")]
        public async Task<IActionResult> GetRolesWithMembers()
        {
            // 1. Lấy danh sách roles từ Database
            var dbRoles = await _unitOfWork.Roles.GetAllAsync();
            var roleList = dbRoles?.ToList() ?? new List<Role>();

            // 2. Lấy danh sách người dùng còn hoạt động từ Database
            var dbUsers = await _unitOfWork.User.GetAllAsync(u => u.DeletedAt == null);
            var usersList = dbUsers?.ToList() ?? new List<User>();

            // 3. Lấy tin nhắn gần nhất từ Database (Bảng Notifications)
            var recentMessages = await _unitOfWork.Notifications.GetAllAsync(n => n.Type == "RoleMessage");
            var messagesList = recentMessages?.ToList() ?? new List<Notification>();

            // Tạo từ điển tin nhắn gần nhất theo role
            var latestMessageByRole = messagesList
                .Where(m => !string.IsNullOrEmpty(m.RelatedEntityId))
                .GroupBy(m => m.RelatedEntityId!)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.CreatedAt).FirstOrDefault()
                );

            // Nhóm người dùng theo roleId hoặc roleName
            var result = new List<object>();

            // Danh sách các vai trò chính của hệ thống
            var systemRoles = new[]
            {
                new { Key = "Engineering", Name = "Kỹ sư Robotics", Avatar = "KS", Description = "Kỹ sư kiểm duyệt & chẩn đoán ROS 2" },
                new { Key = "Admin", Name = "Quản trị viên (Admin)", Avatar = "AD", Description = "Quản trị hệ thống & phân quyền" },
                new { Key = "User", Name = "Vận hành hệ thống", Avatar = "VH", Description = "Người dùng & giám sát vận hành Rosbag" }
            };

            foreach (var sRole in systemRoles)
            {
                // Tìm role tương ứng trong DB
                var matchingDbRole = roleList.FirstOrDefault(r =>
                    string.Equals(r.RoleName?.ToString(), sRole.Key, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(r.Description, sRole.Key, StringComparison.OrdinalIgnoreCase));

                var matchingRoleId = matchingDbRole?.Id;

                // Lọc người dùng thuộc role này từ database
                var membersInRole = usersList
                    .Where(u => (!string.IsNullOrEmpty(matchingRoleId) && u.RoleId == matchingRoleId) ||
                                (u.Role != null && string.Equals(u.Role.RoleName?.ToString(), sRole.Key, StringComparison.OrdinalIgnoreCase)))
                    .Select(u => new
                    {
                        id = u.Id,
                        fullName = u.FullName,
                        email = u.Email,
                        avatarUrl = u.AvatarUrl,
                        status = u.Status?.ToString() ?? "Active",
                        isOnline = u.Status == UserStatusEnum.Active
                    })
                    .ToList();

                latestMessageByRole.TryGetValue(sRole.Key, out var latestMsg);

                var timeFormatted = latestMsg?.CreatedAt != null
                    ? latestMsg.CreatedAt.ToLocalTime().ToString("HH:mm")
                    : string.Empty;

                result.Add(new
                {
                    id = sRole.Key,
                    role = sRole.Key,
                    roleName = sRole.Name,
                    avatarText = sRole.Avatar,
                    description = sRole.Description,
                    online = true,
                    memberCount = membersInRole.Count,
                    members = membersInRole,
                    lastMessage = latestMsg?.Message ?? string.Empty,
                    lastTime = timeFormatted,
                    rawTime = latestMsg?.CreatedAt != null
                        ? new DateTimeOffset(latestMsg.CreatedAt).ToUnixTimeMilliseconds()
                        : 0,
                    unread = latestMsg != null && !(latestMsg.IsRead ?? false)
                });
            }

            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử tin nhắn thực tế từ Database của một Role
        /// </summary>
        [HttpGet("messages")]
        public async Task<IActionResult> GetMessagesByRole([FromQuery] string role)
        {
            if (string.IsNullOrWhiteSpace(role))
                return BadRequest("Role is required.");

            var messages = await _unitOfWork.Notifications.GetAllAsync(
                n => n.Type == "RoleMessage" && n.RelatedEntityId == role
            );

            var result = (messages ?? Enumerable.Empty<Notification>())
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    id = m.Id,
                    role = m.RelatedEntityId,
                    sender = m.Title ?? "Thành viên hệ thống",
                    content = m.Message ?? string.Empty,
                    time = m.CreatedAt.ToLocalTime().ToString("HH:mm"),
                    rawTime = new DateTimeOffset(m.CreatedAt).ToUnixTimeMilliseconds(),
                    unread = !(m.IsRead ?? false)
                });

            return Ok(result);
        }

        /// <summary>
        /// Gửi tin nhắn qua API (fallback khi SignalR kết nối lại hoặc gửi REST)
        /// </summary>
        [HttpPost("messages")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Role) || string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest("Invalid message payload.");

            var nowUtc = DateTime.UtcNow;
            var notification = new Notification
            {
                Title = string.IsNullOrWhiteSpace(dto.SenderName) ? "Thành viên hệ thống" : dto.SenderName,
                Message = dto.Content.Trim(),
                Type = "RoleMessage",
                RelatedEntityId = dto.Role,
                IsRead = false,
                CreatedAt = nowUtc
            };

            await _unitOfWork.Notifications.CreateAsync(notification);
            await _unitOfWork.SaveChangesAsync();

            var messagePayload = new
            {
                id = notification.Id,
                role = dto.Role,
                content = notification.Message,
                sender = notification.Title,
                senderRole = dto.SenderRole ?? "User",
                time = DateTime.Now.ToString("HH:mm"),
                timestamp = nowUtc.ToString("o"),
                rawTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };

            // Broadcast qua SignalR Hub
            await _hubContext.Clients.Group(dto.Role).SendAsync("ReceiveRoleMessage", messagePayload);
            if (!string.IsNullOrWhiteSpace(dto.SenderRole) && !string.Equals(dto.SenderRole, dto.Role, StringComparison.OrdinalIgnoreCase))
            {
                await _hubContext.Clients.Group(dto.SenderRole).SendAsync("ReceiveRoleMessage", messagePayload);
            }

            return Ok(messagePayload);
        }
    }

    public class SendMessageDto
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string? SenderEmail { get; set; }
        public string? SenderRole { get; set; }
    }
}
