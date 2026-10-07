using API.Middlewares.Extentions;
using Application.Interfaces.Logging;
using Domain.Enums;

namespace API.Middlewares;

public class UserActivityAuditMiddleware
{
    private readonly RequestDelegate _next;

    public UserActivityAuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IUserActivityLogService activityLog)
    {
        await _next(context);

        if (context.Response.StatusCode is < 200 or >= 400 ||
            context.User.Identity?.IsAuthenticated != true ||
            string.IsNullOrWhiteSpace(context.User.GetUserId())) return;

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/user-activity", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/bags/jobs/", StringComparison.OrdinalIgnoreCase) ||
            (path.StartsWith("/api/admin/members/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/role", StringComparison.OrdinalIgnoreCase)) ||
            (path.StartsWith("/api/reviews/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/decision", StringComparison.OrdinalIgnoreCase))) return;

        var method = context.Request.Method.ToUpperInvariant();
        var segments = path.Trim('/').Split('/');
        var resource = segments.Length > 1 ? segments[1].ToLowerInvariant() : string.Empty;
        var id = segments.Length > 2 ? segments[2] : null;

        var (action, target) = (resource, method, id?.ToLowerInvariant()) switch
        {
            ("bags", "POST", "upload" or "upload-and-inspect") => (UserActionType.UploadRosbag, TargetType.Rosbag),
            ("bags", "POST", "inspect") => (UserActionType.InspectRosbag, TargetType.Rosbag),
            ("bags", "POST", _) => (UserActionType.CreateRosbag, TargetType.Rosbag),
            ("bags", "DELETE", _) => (UserActionType.DeleteRosbag, TargetType.Rosbag),
            ("bags", "GET", _) => (UserActionType.ViewRosbag, TargetType.Rosbag),
            ("sessions", "POST", "start") => (UserActionType.StartAnalysis, TargetType.AnalysisSession),
            ("sessions", "GET", _) => (UserActionType.ViewSession, TargetType.AnalysisSession),
            ("reviews", "GET", _) => (UserActionType.ViewReview, TargetType.Finding),
            ("reports", "POST", _) => (UserActionType.CreateReport, TargetType.Report),
            ("reports", "GET", _) => (UserActionType.ViewReport, TargetType.Report),
            ("dashboard", "GET", _) => (UserActionType.ViewDashboard, TargetType.None),
            ("admin", "PUT", "ai-config") => (UserActionType.UpdateAiConfig, TargetType.AiConfig),
            ("admin", "GET", "ai-config") => (UserActionType.ViewAiConfig, TargetType.AiConfig),
            ("admin", "GET", "ai-usage") => (UserActionType.ViewAiUsage, TargetType.AiConfig),
            ("admin", "GET", _) => (UserActionType.ViewMembers, TargetType.User),
            ("system-logs", "GET", _) => (UserActionType.ViewSystemLogs, TargetType.None),
            ("system-logs", "POST", _) => (UserActionType.TriggerSystemError, TargetType.SystemSettings),
            _ => (UserActionType.ViewSystem, TargetType.None)
        };

        await activityLog.LogActivityAsync(new LogActivityRequest(
            UserId: context.User.GetUserId()!,
            ActionType: action,
            TargetId: id is "upload" or "upload-and-inspect" or "inspect" or "start" or "stats" or "ai-config" or "ai-usage" ? null : id,
            TargetType: target,
            Description: path,
            RequestPath: path,
            HttpMethod: method,
            IpAddress: context.Connection.RemoteIpAddress?.ToString(),
            UserAgent: context.Request.Headers["User-Agent"].ToString()));
    }
}
