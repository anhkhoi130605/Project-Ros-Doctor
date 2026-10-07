using API.Middlewares.Extentions;
using Application.Interfaces.Logging;
using Domain.Enums;
using Microsoft.AspNetCore.Mvc.Controllers;

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
            string.IsNullOrWhiteSpace(context.User.GetUserId()) ||
            context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>() is not { } endpoint) return;

        // Match known controller actions instead of parsing an untrusted request path.
        // Actions with explicit audit records are omitted to avoid duplicate events.
        var activity = (endpoint.ControllerName, endpoint.ActionName) switch
        {
            ("Bags", "UploadBagBackground" or "UploadAndInspect") => (UserActionType.UploadRosbag, TargetType.Rosbag),
            ("Bags", "InspectBag") => (UserActionType.InspectRosbag, TargetType.Rosbag),
            ("Bags", "CreateBag") => (UserActionType.CreateRosbag, TargetType.Rosbag),
            ("Bags", "DeleteBag") => (UserActionType.DeleteRosbag, TargetType.Rosbag),
            ("Bags", "GetBags" or "GetSampleBags" or "GetBagById") => (UserActionType.ViewRosbag, TargetType.Rosbag),
            ("Sessions", "StartAnalysis") => (UserActionType.StartAnalysis, TargetType.AnalysisSession),
            ("Sessions", "GetSessionById") => (UserActionType.ViewSession, TargetType.AnalysisSession),
            ("Reviews", "GetReviews" or "GetReviewById") => (UserActionType.ViewReview, TargetType.Finding),
            ("Reports", "CreateReport") => (UserActionType.CreateReport, TargetType.Report),
            ("Reports", "GetReports" or "GetReportById") => (UserActionType.ViewReport, TargetType.Report),
            ("Dashboard", "GetDashboardStats") => (UserActionType.ViewDashboard, TargetType.None),
            ("AiConfig", "UpdateAiConfig") => (UserActionType.UpdateAiConfig, TargetType.AiConfig),
            ("AiConfig", "GetAiConfig") => (UserActionType.ViewAiConfig, TargetType.AiConfig),
            ("AiConfig", "GetAiUsage") => (UserActionType.ViewAiUsage, TargetType.AiConfig),
            ("Admin", "GetMembers" or "GetAdminProfile") => (UserActionType.ViewMembers, TargetType.User),
            ("SystemLog", "GetLogs") => (UserActionType.ViewSystemLogs, TargetType.None),
            ("SystemLog", "TriggerTestError") => (UserActionType.TriggerSystemError, TargetType.SystemSettings),
            _ => ((UserActionType, TargetType)?)null
        };

        if (activity is not { } audit) return;

        var targetId = context.Request.RouteValues.TryGetValue("id", out var id) ? id?.ToString()
            : context.Request.RouteValues.TryGetValue("findingId", out var findingId) ? findingId?.ToString()
            : null;
        var path = context.Request.Path.Value ?? string.Empty;
        var userAgent = context.Request.Headers.UserAgent.ToString();

        await activityLog.LogActivityAsync(new LogActivityRequest(
            UserId: context.User.GetUserId()!,
            ActionType: audit.Item1,
            TargetId: targetId is { Length: > 200 } ? targetId[..200] : targetId,
            TargetType: audit.Item2,
            Description: null,
            RequestPath: path.Length > 500 ? path[..500] : path,
            HttpMethod: context.Request.Method,
            IpAddress: context.Connection.RemoteIpAddress?.ToString(),
            UserAgent: userAgent.Length > 500 ? userAgent[..500] : userAgent));
    }
}
