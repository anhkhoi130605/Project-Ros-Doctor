using Domain.Enums;

namespace Application.Interfaces.Logging
{
    /// <summary>
    /// Ghi lại hành động của người dùng (tạo, xoá, cập nhật...) phục vụ audit trail.
    /// </summary>
    public interface IUserActivityLogService
    {
        Task LogActivityAsync(
            string userId,
            UserActionType actionType,
            string? targetId = null,
            TargetType targetType = TargetType.None,
            string? description = null,
            string? requestPath = null,
            string? httpMethod = null,
            string? ipAddress = null,
            string? userAgent = null);
    }
}
