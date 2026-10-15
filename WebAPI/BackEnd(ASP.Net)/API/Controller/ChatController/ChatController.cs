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

            var senderId = CurrentUserId ?? (!string.IsNullOrWhiteSpace(dto.SenderEmail) ? dto.SenderEmail : $"anonymous_{Guid.NewGuid():N}");
            var senderName = !string.IsNullOrWhiteSpace(dto.SenderName) 
                ? dto.SenderName 
                : User.FindFirst(ClaimTypes.Name)?.Value ?? "Thành viên hệ thống";
            var senderEmail = !string.IsNullOrWhiteSpace(dto.SenderEmail)
                ? dto.SenderEmail
                : User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
            var senderRole = !string.IsNullOrWhiteSpace(dto.SenderRole)
                ? dto.SenderRole
                : User.FindFirst(ClaimTypes.Role)?.Value ?? "User";

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
}
