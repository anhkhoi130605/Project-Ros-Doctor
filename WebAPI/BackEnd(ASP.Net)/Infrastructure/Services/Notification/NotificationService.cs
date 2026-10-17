using Application.Features.SystemModule.Notification;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Notifications;
using Domain.Enums;
using NotificationEntity = Domain.Entities.Notifications.Notification;

namespace Infrastructure.Services.Notification
{
    public class NotificationService : INotificationService
    {
        private readonly IUnitOfWork _unitOfWork;

        public NotificationService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task SendNotificationAsync(SendNotificationRequest request)
        {
            // Resolve user entity by receiver id and set navigation property
            var user = string.IsNullOrWhiteSpace(request.ReceiverId)
                ? null
                : await _unitOfWork.User.GetByIdAsync(request.ReceiverId);

            var notification = new NotificationEntity
            {
                User = user,
                Title = request.Title,
                Message = request.Message,
                Type = request.Type.ToString(),
                RelatedEntityId = request.RelatedEntityId,
                IsRead = false
            };

            await _unitOfWork.Notifications.CreateAsync(notification);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<List<NotificationDto>> GetNotificationsForUserAsync(string userId, string? role, int take = 50)
        {
            var isUserAdmin = !string.IsNullOrWhiteSpace(role) && role.Equals("Admin", StringComparison.OrdinalIgnoreCase);

            var query = await _unitOfWork.Notifications.GetAllAsync(
                filter: n => isUserAdmin || n.User == null || n.User.Id == userId,
                includes: q => q.OrderByDescending(n => n.CreatedAt)
            );

            var list = query
                .Take(take)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    IsRead = n.IsRead ?? false,
                    Type = n.Type,
                    RelatedEntityId = n.RelatedEntityId,
                    CreatedAt = n.CreatedAt,
                    ReceiverId = n.User?.Id
                })
                .ToList();

            // Nếu DB chưa có bản ghi thông báo, tự động tổng hợp từ dữ liệu thực tế hệ thống theo Role
            if (list.Count == 0)
            {
                if (isUserAdmin)
                {
                    // 1. AdminNotificationType.SystemError: Lỗi hệ thống thực tế từ SystemErrorLogs
                    var latestErrors = (await _unitOfWork.SystemErrorLogs.GetAllAsync(
                        filter: x => x.LogLevel == "Error" || x.LogLevel == "Fatal",
                        includes: q => q.OrderByDescending(x => x.CreatedAt)
                    )).Take(3);

                    foreach (var err in latestErrors)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"sys_{err.Id}",
                            Title = "Lỗi hệ thống máy chủ",
                            Message = err.ErrorMessage ?? err.TranslatedMessage ?? "Phát hiện ngoại lệ trong quá trình vận hành.",
                            Type = AdminNotificationType.SystemError.ToString(),
                            RelatedEntityId = err.Id,
                            CreatedAt = err.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 2. AdminNotificationType.ReceivedRequest: Yêu cầu người dùng (duyệt tài khoản)
                    var pendingUsers = (await _unitOfWork.User.GetAllAsync(
                        filter: u => u.Status == UserEnum.UserStatusEnum.PendingApproval
                    )).Take(3);

                    foreach (var u in pendingUsers)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"req_{u.Id}",
                            Title = "Yêu cầu người dùng gửi tới",
                            Message = $"Người dùng {u.FullName ?? u.Email} gửi yêu cầu phê duyệt tài khoản.",
                            Type = AdminNotificationType.ReceivedRequest.ToString(),
                            RelatedEntityId = u.Id,
                            CreatedAt = u.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 3. AdminNotificationType.UserRegistered: Người dùng đăng ký mới
                    var recentUsers = (await _unitOfWork.User.GetAllAsync(
                        includes: q => q.OrderByDescending(u => u.CreatedAt)
                    )).Take(3);

                    foreach (var u in recentUsers)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"usr_{u.Id}",
                            Title = "Người dùng mới đăng ký",
                            Message = $"Tài khoản {u.Email} vừa hoàn tất đăng ký vào hệ thống.",
                            Type = AdminNotificationType.UserRegistered.ToString(),
                            RelatedEntityId = u.Id,
                            CreatedAt = u.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 4. AdminNotificationType.ReceivedMessage: Tin nhắn người dùng gửi tới
                    var recentConversations = (await _unitOfWork.ChatConversations.GetAllAsync(
                        includes: q => q.OrderByDescending(c => c.CreatedAt)
                    )).Take(3);

                    foreach (var conv in recentConversations)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"msg_{conv.Id}",
                            Title = "Tin nhắn nhận được từ người dùng",
                            Message = $"Cuộc trò chuyện: {conv.Title ?? "Yêu cầu hỗ trợ"}",
                            Type = AdminNotificationType.ReceivedMessage.ToString(),
                            RelatedEntityId = conv.Id,
                            CreatedAt = conv.CreatedAt,
                            IsRead = false
                        });
                    }
                }
                else if (!string.IsNullOrWhiteSpace(role) && (role.Equals("Engineering", StringComparison.OrdinalIgnoreCase) || role.Equals("Engineer", StringComparison.OrdinalIgnoreCase)))
                {
                    // =========================================================
                    // VAI TRÒ KỸ SƯ ROBOTICS (EngineerNotificationType)
                    // =========================================================

                    // 1. ReviewRequired: Vấn đề chẩn đoán cần kỹ sư review / kết luận
                    var pendingIssues = (await _unitOfWork.DiagnosticIssues.GetAllAsync(
                        includes: q => q.OrderByDescending(x => x.CreatedAt)
                    )).Take(3);

                    foreach (var issue in pendingIssues)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"eng_rev_{issue.Id}",
                            Title = "Kết luận chẩn đoán cần xác minh",
                            Message = $"Sự cố: {issue.IssueTitle} trên topic '{issue.Topic ?? "/telemetry"}' đang chờ kỹ sư xử lý.",
                            Type = EngineerNotificationType.ReviewRequired.ToString(),
                            RelatedEntityId = issue.Id,
                            CreatedAt = issue.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 2. RosbagUploaded: Bản ghi Rosbag mới sẵn sàng phân tích
                    var recentBags = (await _unitOfWork.Rosbags.GetAllAsync(
                        includes: q => q.OrderByDescending(b => b.CreatedAt)
                    )).Take(2);

                    foreach (var bag in recentBags)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"eng_bag_{bag.Id}",
                            Title = "Bản ghi Rosbag mới sẵn sàng",
                            Message = $"Tệp telemetry '{bag.FileName}' đã được đồng bộ, sẵn sàng để phân tích chi tiết.",
                            Type = EngineerNotificationType.RosbagUploaded.ToString(),
                            RelatedEntityId = bag.Id,
                            CreatedAt = bag.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 3. SystemError: Lỗi hệ thống kỹ thuật
                    var sysErrors = (await _unitOfWork.SystemErrorLogs.GetAllAsync(
                        filter: x => x.LogLevel == "Error" || x.LogLevel == "Fatal",
                        includes: q => q.OrderByDescending(x => x.CreatedAt)
                    )).Take(2);

                    foreach (var err in sysErrors)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"eng_sys_{err.Id}",
                            Title = "Cảnh báo lỗi hệ thống",
                            Message = err.ErrorMessage ?? "Phát hiện sự cố kỹ thuật trên hệ thống cần xử lý.",
                            Type = EngineerNotificationType.SystemError.ToString(),
                            RelatedEntityId = err.Id,
                            CreatedAt = err.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 4. NewChatMessage: Tin nhắn trao đổi kỹ thuật
                    var engConversations = (await _unitOfWork.ChatConversations.GetAllAsync(
                        filter: c => c.CreatorId == userId || c.TargetRole == "Engineering" || c.TargetRole == "Engineer",
                        includes: q => q.OrderByDescending(c => c.CreatedAt)
                    )).Take(2);

                    foreach (var conv in engConversations)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"eng_msg_{conv.Id}",
                            Title = "Tin nhắn kỹ thuật mới",
                            Message = $"Hội thoại '{conv.Title ?? "Hỗ trợ kỹ thuật"}' có phản hồi mới.",
                            Type = EngineerNotificationType.NewChatMessage.ToString(),
                            RelatedEntityId = conv.Id,
                            CreatedAt = conv.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 5. SystemBroadcast: Thông báo chung
                    list.Add(new NotificationDto
                    {
                        Id = "eng_broadcast_welcome",
                        Title = "Thông báo hệ thống",
                        Message = "Công cụ phân tích và chẩn đoán ROS2 đã sẵn sàng hoạt động.",
                        Type = EngineerNotificationType.SystemBroadcast.ToString(),
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    });
                }
                else
                {
                    // =========================================================
                    // VAI TRÒ NGƯỜI DÙNG / VẬN HÀNH (UserNotificationType)
                    // =========================================================

                    // 1. ReportReady: Báo cáo chẩn đoán hoàn tất
                    var reports = (await _unitOfWork.Reports.GetAllAsync(
                        includes: q => q.OrderByDescending(r => r.CreatedAt)
                    )).Take(2);

                    foreach (var rpt in reports)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"usr_rpt_{rpt.Id}",
                            Title = "Báo cáo chẩn đoán hoàn tất",
                            Message = $"Báo cáo '{rpt.Title}' về sự cố phương tiện đã có kết luận và khuyến nghị.",
                            Type = UserNotificationType.ReportReady.ToString(),
                            RelatedEntityId = rpt.Id,
                            CreatedAt = rpt.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 2. RosbagProcessed: Bản ghi Rosbag tải lên đã xử lý xong
                    var userBags = (await _unitOfWork.Rosbags.GetAllAsync(
                        filter: b => b.UserId == userId,
                        includes: q => q.OrderByDescending(b => b.CreatedAt)
                    )).Take(2);

                    foreach (var bag in userBags)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"usr_bag_{bag.Id}",
                            Title = "Bản ghi Rosbag đã xử lý xong",
                            Message = $"Bản ghi '{bag.FileName}' đã được giải nén và phân tích thành công.",
                            Type = UserNotificationType.RosbagProcessed.ToString(),
                            RelatedEntityId = bag.Id,
                            CreatedAt = bag.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 3. NewChatMessage: Tin nhắn phản hồi từ Admin/Kỹ sư
                    var userConversations = (await _unitOfWork.ChatConversations.GetAllAsync(
                        filter: c => c.CreatorId == userId || c.TargetRole == "User",
                        includes: q => q.OrderByDescending(c => c.CreatedAt)
                    )).Take(2);

                    foreach (var conv in userConversations)
                    {
                        list.Add(new NotificationDto
                        {
                            Id = $"usr_msg_{conv.Id}",
                            Title = "Tin nhắn phản hồi mới",
                            Message = $"Bạn có phản hồi mới trong phiên chat: {conv.Title ?? "Hỗ trợ khách hàng"}",
                            Type = UserNotificationType.NewChatMessage.ToString(),
                            RelatedEntityId = conv.Id,
                            CreatedAt = conv.CreatedAt,
                            IsRead = false
                        });
                    }

                    // 4. SystemBroadcast: Thông báo chung
                    list.Add(new NotificationDto
                    {
                        Id = "usr_broadcast_welcome",
                        Title = "Thông báo hệ thống",
                        Message = "Chào mừng bạn đến với ROS2 Doctor. Giám sát và chẩn đoán xe đang hoạt động bình thường.",
                        Type = UserNotificationType.SystemBroadcast.ToString(),
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    });
                }
            }

            return list.OrderByDescending(x => x.CreatedAt).Take(take).ToList();
        }

        public async Task<bool> MarkAsReadAsync(string notificationId, string userId)
        {
            var notif = await _unitOfWork.Notifications.GetByIdAsync(notificationId);
            if (notif == null) return false;
            notif.IsRead = true;
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllAsReadAsync(string userId)
        {
            var notifs = await _unitOfWork.Notifications.GetAllAsync(
                filter: n => n.User == null || n.User.Id == userId
            );
            foreach (var n in notifs)
            {
                n.IsRead = true;
            }
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}

