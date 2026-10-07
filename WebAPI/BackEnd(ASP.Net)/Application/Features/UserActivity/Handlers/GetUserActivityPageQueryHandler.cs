using Application.Features.UserActivity.Queries;
using Application.Interfaces.ManageTransaction;
using Domain.Common;
using MediatR;

namespace Application.Features.UserActivity.Handlers;

public class GetUserActivityPageQueryHandler : IRequestHandler<GetUserActivityPageQuery, PaginationResult<UserActivityLogDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetUserActivityPageQueryHandler(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task<PaginationResult<UserActivityLogDto>> Handle(GetUserActivityPageQuery request, CancellationToken cancellationToken)
    {
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var logSearch = request.LogSearch?.Trim().ToLowerInvariant();
        var userSearch = request.UserSearch?.Trim().ToLowerInvariant();
        var actionMatches = request.ActionMatches?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];
        System.Linq.Expressions.Expression<Func<Domain.Entities.Identity.UserActivityLog, bool>> filter = log =>
            (string.IsNullOrEmpty(logSearch) ||
                log.Action.ToLower().Contains(logSearch) ||
                actionMatches.Contains(log.Action) ||
                (log.RequestPath != null && log.RequestPath.ToLower().Contains(logSearch)) ||
                (log.EntityType != null && log.EntityType.ToLower().Contains(logSearch)) ||
                (log.EntityId != null && log.EntityId.ToLower().Contains(logSearch)) ||
                log.Id.ToLower().Contains(logSearch)) &&
            (string.IsNullOrEmpty(userSearch) ||
                (log.UserName != null && log.UserName.ToLower().Contains(userSearch)) ||
                (log.Email != null && log.Email.ToLower().Contains(userSearch)) ||
                (log.UserId != null && log.UserId.ToLower().Contains(userSearch)));
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
