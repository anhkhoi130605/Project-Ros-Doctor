using Domain.Enums;
using System.Threading.Tasks;

namespace Application.Interfaces.Logging
{
    public record LogActivityRequest(
        string UserId,
        UserActionType ActionType,
        string? TargetId = null,
        TargetType TargetType = TargetType.None,
        string? Description = null,
        string? RequestPath = null,
        string? HttpMethod = null,
        string? IpAddress = null,
        string? UserAgent = null);

    /// <summary>
    /// Ghi lại hành động của người dùng (tạo, xoá, cập nhật...) phục vụ audit trail.
    /// </summary>
    public interface IUserActivityLogService
    {
        Task LogActivityAsync(LogActivityRequest request);

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
