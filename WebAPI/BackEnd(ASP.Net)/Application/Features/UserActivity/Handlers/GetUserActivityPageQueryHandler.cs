using Application.Features.UserActivity.Queries;
using Application.Interfaces.ManageTransaction;
using Domain.Common;
using Domain.Entities.Identity;
using Domain.Enums;
using MediatR;
using System.Linq.Expressions;

namespace Application.Features.UserActivity.Handlers;

public class GetUserActivityPageQueryHandler : IRequestHandler<GetUserActivityPageQuery, PaginationResult<UserActivityLogDto>>
{
    private static readonly string[] ValidActions = Enum.GetNames<UserActionType>();
    private readonly IUnitOfWork _unitOfWork;

    public GetUserActivityPageQueryHandler(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task<PaginationResult<UserActivityLogDto>> Handle(GetUserActivityPageQuery request, CancellationToken cancellationToken)
    {
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var logSearch = request.LogSearch?.Trim() ?? string.Empty;
        var userSearch = request.UserSearch?.Trim() ?? string.Empty;
        var actionMatches = request.ActionMatches?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(action => ValidActions.Contains(action, StringComparer.Ordinal))
            .Distinct(StringComparer.Ordinal)
            .Take(ValidActions.Length)
            .ToArray() ?? [];

        // MySQL's utf8mb4_0900_ai_ci collation already compares text case-insensitively.
        // Keep the unfiltered path free of search predicates so the CreatedAt index can serve it.
        Expression<Func<UserActivityLog, bool>>? filter = null;
        var hasLogFilter = logSearch.Length > 0 || actionMatches.Length > 0;
        var hasUserFilter = userSearch.Length > 0;
        if (hasLogFilter && hasUserFilter)
            filter = log =>
                ((logSearch.Length > 0 && (log.Action.Contains(logSearch) ||
                 (log.RequestPath != null && log.RequestPath.Contains(logSearch)) ||
                 (log.EntityType != null && log.EntityType.Contains(logSearch)) ||
                 (log.EntityId != null && log.EntityId.Contains(logSearch)) || log.Id.Contains(logSearch))) ||
                 actionMatches.Contains(log.Action)) &&
                ((log.UserName != null && log.UserName.Contains(userSearch)) ||
                 (log.Email != null && log.Email.Contains(userSearch)) ||
                 (log.UserId != null && log.UserId.Contains(userSearch)));
        else if (hasLogFilter)
            filter = log => (logSearch.Length > 0 && (log.Action.Contains(logSearch) ||
                (log.RequestPath != null && log.RequestPath.Contains(logSearch)) ||
                (log.EntityType != null && log.EntityType.Contains(logSearch)) ||
                (log.EntityId != null && log.EntityId.Contains(logSearch)) || log.Id.Contains(logSearch))) ||
                actionMatches.Contains(log.Action);
        else if (hasUserFilter)
            filter = log => (log.UserName != null && log.UserName.Contains(userSearch)) ||
                (log.Email != null && log.Email.Contains(userSearch)) ||
                (log.UserId != null && log.UserId.Contains(userSearch));
        var total = await _unitOfWork.UserActivityLogs.CountAsync(filter, cancellationToken);
        var logs = await _unitOfWork.UserActivityLogs.GetAllAsync(
            filter: filter,
            includes: query => query.OrderByDescending(log => log.CreatedAt).ThenByDescending(log => log.Id)
                .Skip((pageNumber - 1) * pageSize).Take(pageSize),
            cancellationToken: cancellationToken);

        var items = logs.Select(log => new UserActivityLogDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserName = log.UserName,
            Email = log.Email,
            Action = log.Action,
            EntityType = log.EntityType,
            EntityId = log.EntityId,
            RequestPath = log.RequestPath,
            HttpMethod = log.HttpMethod,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            CreatedAt = log.CreatedAt
        }).ToList();

        return new PaginationResult<UserActivityLogDto>(items, total, pageNumber, pageSize);
    }
}
