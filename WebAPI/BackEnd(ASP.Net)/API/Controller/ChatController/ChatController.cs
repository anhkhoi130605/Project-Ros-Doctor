using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Chat.Commands;
using Application.Features.Chat.DTOs;
using Application.Features.Chat.Queries;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.ChatController
{
    internal static class ChatErrorMessages
    {
        public const string RoleRequired = "Tham số 'role' là bắt buộc.";
        public const string MessageContentOrRoleRequired = "Nội dung tin nhắn và Role không được để trống.";
    }

    /// <summary>
    /// Interface Adapter (Presentation Layer) cho Chat System theo Clean Architecture.
    /// Không chứa business logic hay truy cập database trực tiếp; ủy thác toàn bộ cho Use Cases qua IMediator.
    /// </summary>
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ChatController : BaseController
    {
        private readonly IMediator _mediator;

        public ChatController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// 1. Lấy danh sách Roles kèm thành viên thực tế và tin nhắn mới nhất
        /// </summary>
        [HttpGet("roles")]
        public async Task<IActionResult> GetRolesWithMembers(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetChatRolesQuery(), cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// 2. Lấy lịch sử tin nhắn của một Role (hỗ trợ phân trang)
        /// </summary>
        [HttpGet("messages")]
        public async Task<IActionResult> GetMessagesByRole(
            [FromQuery] string role,
            [FromQuery] int limit = 50,
            [FromQuery] DateTime? before = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(role))
                return BadRequest(new { message = ChatErrorMessages.RoleRequired });

            // Ràng buộc phân quyền đọc kênh nhạy cảm
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) && !User.IsInRole("Admin"))
                return Forbid();
            if (string.Equals(role, "Engineering", StringComparison.OrdinalIgnoreCase) && !User.IsInRole("Admin") && !User.IsInRole("Engineering"))
                return Forbid();

            var result = await _mediator.Send(new GetChatMessagesByRoleQuery(role, limit, before, CurrentUserId), cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// 3. Gửi tin nhắn qua REST API (fallback khi WebSocket ngắt kết nối)
        /// </summary>
        [HttpPost("messages")]
        public async Task<IActionResult> SendMessage(
            [FromBody] SendMessageRequestDto dto,
            CancellationToken cancellationToken)
        {
            var trimmedContent = dto?.Content?.Trim() ?? string.Empty;
            if (dto == null || string.IsNullOrWhiteSpace(dto.Role) || string.IsNullOrWhiteSpace(trimmedContent))
                return BadRequest(new { message = ChatErrorMessages.MessageContentOrRoleRequired });

            string senderId;
            string senderName;
            string senderEmail;
            string senderRole;

            if (!string.IsNullOrWhiteSpace(CurrentUserId))
            {
                senderId = CurrentUserId;
                senderName = User.FindFirst(ClaimTypes.Name)?.Value ?? (!string.IsNullOrWhiteSpace(dto.SenderName) ? dto.SenderName : "Thành viên hệ thống");
                senderEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? (dto.SenderEmail ?? string.Empty);
                senderRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "User";
            }
            else
            {
                senderId = !string.IsNullOrWhiteSpace(dto.SenderEmail) ? dto.SenderEmail : $"anonymous_{Guid.NewGuid():N}";
                senderName = !string.IsNullOrWhiteSpace(dto.SenderName) ? dto.SenderName : "Người dùng ẩn danh";
                senderEmail = dto.SenderEmail ?? string.Empty;
                senderRole = "Anonymous";
            }

            var command = new SendChatMessageCommand(
                TargetRole: dto.Role,
                Content: trimmedContent,
                MediaUrls: dto.MediaUrls,
                SenderId: senderId,
                SenderName: senderName,
                SenderEmail: senderEmail,
                SenderRole: senderRole
            );

            var result = await _mediator.Send(command, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// 4. Lấy lịch sử các phiên trò chuyện AI Agent của tài khoản hiện tại (đồng bộ đa thiết bị)
        /// </summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetUserChatHistory(
            [FromQuery] string? userKey = null,
            [FromQuery] string? email = null,
            CancellationToken cancellationToken = default)
        {
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? email;
            var json = await _mediator.Send(
                new GetUserChatHistoryQuery(CurrentUserId, userEmail, userKey),
                cancellationToken);
            using var doc = System.Text.Json.JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json);
            return Ok(new { conversations = doc.RootElement.Clone() });
        }

        /// <summary>
        /// 5. Lưu & hợp nhất lịch sử các phiên trò chuyện AI Agent của tài khoản hiện tại
        /// </summary>
        [HttpPut("history")]
        [HttpPost("history")]
        public async Task<IActionResult> SaveUserChatHistory(
            [FromBody] SaveUserChatHistoryRequestDto? dto,
            CancellationToken cancellationToken = default)
        {
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? dto?.Email;
            var conversationsJson = dto != null && dto.Conversations.ValueKind == System.Text.Json.JsonValueKind.Array
                ? dto.Conversations.GetRawText()
                : "[]";
            var mergedJson = await _mediator.Send(
                new SaveUserChatHistoryCommand(CurrentUserId, userEmail, dto?.UserKey, conversationsJson),
                cancellationToken);
            using var doc = System.Text.Json.JsonDocument.Parse(string.IsNullOrWhiteSpace(mergedJson) ? "[]" : mergedJson);
            return Ok(new { conversations = doc.RootElement.Clone() });
        }
    }

    public class SendMessageRequestDto
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string? SenderEmail { get; set; }
        public string? SenderRole { get; set; }
        public List<string>? MediaUrls { get; set; }
    }

    public class SaveUserChatHistoryRequestDto
    {
        public string? UserKey { get; set; }
        public string? Email { get; set; }
        public System.Text.Json.JsonElement Conversations { get; set; }
    }
}
