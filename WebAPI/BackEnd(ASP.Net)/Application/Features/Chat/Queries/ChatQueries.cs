using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Chat.DTOs;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Repositories;
using Domain.Entities.Identity;
using Domain.Enums;
using MediatR;
using static Domain.Enums.UserEnum;

namespace Application.Features.Chat.Queries
{
    public record GetChatRolesQuery() : IRequest<List<ChatRoleDto>>;

    public class GetChatRolesQueryHandler : IRequestHandler<GetChatRolesQuery, List<ChatRoleDto>>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IChatMessageRepository _chatMessageRepository;

        public GetChatRolesQueryHandler(
            IUnitOfWork unitOfWork,
            IChatMessageRepository chatMessageRepository)
        {
            _unitOfWork = unitOfWork;
            _chatMessageRepository = chatMessageRepository;
        }

        public async Task<List<ChatRoleDto>> Handle(GetChatRolesQuery request, CancellationToken cancellationToken)
        {
            // 1. Lấy danh sách Roles từ MySQL
            var dbRoles = await _unitOfWork.Roles.GetAllAsync(null, null, cancellationToken);
            var roleList = dbRoles?.ToList() ?? new List<Role>();

            // 2. Lấy danh sách Người dùng từ MySQL
            var dbUsers = await _unitOfWork.User.GetAllAsync(u => u.DeletedAt == null, null, cancellationToken);
            var usersList = dbUsers?.ToList() ?? new List<User>();

            var systemRoles = new[]
            {
                new { Key = "Engineering", Name = "Kỹ sư Robotics", Avatar = "KS", Description = "Kỹ sư kiểm duyệt & chẩn đoán ROS 2" },
                new { Key = "Admin", Name = "Quản trị viên (Admin)", Avatar = "AD", Description = "Quản trị hệ thống & phân quyền" },
                new { Key = "User", Name = "Vận hành hệ thống", Avatar = "VH", Description = "Người dùng & giám sát vận hành Rosbag" }
            };

            var roleDtos = new List<ChatRoleDto>();

            foreach (var r in systemRoles)
            {
                var roleEntity = roleList.FirstOrDefault(x => string.Equals(x.RoleName?.ToString(), r.Key, StringComparison.OrdinalIgnoreCase));
                var roleId = roleEntity?.Id;

                var matchedUsers = usersList.Where(u =>
                {
                    if (roleId != null && u.RoleId == roleId) return true;
                    if (u.Role != null && string.Equals(u.Role.RoleName?.ToString(), r.Key, StringComparison.OrdinalIgnoreCase)) return true;
                    return false;
                }).ToList();

                var memberDtos = matchedUsers.Select(u => new ChatMemberDto
                {
                    Id = u.Id,
                    FullName = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : u.UserName ?? "Thành viên",
                    Email = u.Email ?? "",
                    AvatarUrl = u.AvatarUrl,
                    Status = u.Status == UserStatusEnum.Active ? "Active" : "Inactive",
                    IsOnline = true
                }).ToList();

                // Lấy tin nhắn gần nhất từ MongoDB
                string lastMsg = "";
                string lastTimeStr = "";
                long rawTime = 0;

                try
                {
                    var latestMsg = await _chatMessageRepository.GetLatestMessageByRoleAsync(r.Key, cancellationToken);
                    if (latestMsg != null)
                    {
                        var senderName = !string.IsNullOrEmpty(latestMsg.SenderName) ? latestMsg.SenderName : "Thành viên";
                        lastMsg = $"{senderName}: {latestMsg.Content}";
                        lastTimeStr = FormatRelativeTime(latestMsg.CreatedAt);
                        rawTime = new DateTimeOffset(latestMsg.CreatedAt).ToUnixTimeMilliseconds();
                    }
                }
                catch
                {
                    // Fallback an toàn nếu MongoDB đang khởi tạo
                }

                roleDtos.Add(new ChatRoleDto
                {
                    Id = r.Key,
                    Role = r.Key,
                    RoleName = r.Name,
                    AvatarText = r.Avatar,
                    Description = r.Description,
                    Online = memberDtos.Count > 0,
                    MemberCount = memberDtos.Count,
                    Members = memberDtos,
                    LastMessage = lastMsg,
                    LastTime = lastTimeStr,
                    RawTime = rawTime,
                    Unread = false
                });
            }

            return roleDtos;
        }

        private static string FormatRelativeTime(DateTime time)
        {
            var diff = DateTime.UtcNow - time.ToUniversalTime();
            if (diff.TotalMinutes < 1) return "Vừa xong";
            if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m";
            if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}h";
            return time.ToString("dd/MM");
        }
    }

    public record GetChatMessagesByRoleQuery(string TargetRole, int Limit, DateTime? Before, string? CurrentUserId) : IRequest<List<ChatMessageDto>>;

    public class GetChatMessagesByRoleQueryHandler : IRequestHandler<GetChatMessagesByRoleQuery, List<ChatMessageDto>>
    {
        private readonly IChatMessageRepository _chatMessageRepository;

        public GetChatMessagesByRoleQueryHandler(IChatMessageRepository chatMessageRepository)
        {
            _chatMessageRepository = chatMessageRepository;
        }

        public async Task<List<ChatMessageDto>> Handle(GetChatMessagesByRoleQuery request, CancellationToken cancellationToken)
        {
            var limit = request.Limit <= 0 || request.Limit > 100 ? 50 : request.Limit;
            var messages = await _chatMessageRepository.GetMessagesByRoleAsync(request.TargetRole, limit, cancellationToken);

            return messages.Select(m => new ChatMessageDto
            {
                Id = m.Id ?? string.Empty,
                ConversationId = m.ConversationId,
                TargetRole = m.TargetRole ?? string.Empty,
                SenderId = m.SenderId,
                SenderName = m.SenderName,
                SenderEmail = m.SenderEmail ?? string.Empty,
                SenderRole = m.SenderRole,
                Content = m.Content,
                MediaUrls = m.MediaUrls ?? new List<string>(),
                Status = m.Status,
                Reactions = m.Reactions ?? new Dictionary<string, string>(),
                CreatedAt = m.CreatedAt,
                IsMe = !string.IsNullOrEmpty(request.CurrentUserId) && string.Equals(m.SenderId, request.CurrentUserId, StringComparison.OrdinalIgnoreCase)
            }).ToList();
        }
    }
}
