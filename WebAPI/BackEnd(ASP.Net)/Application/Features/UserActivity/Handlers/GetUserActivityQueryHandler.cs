using Application.Features.UserActivity.Queries;
using Application.Interfaces.ManageTrancsaction;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.UserActivity.Handlers
{
    public class GetUserActivityQueryHandler : IRequestHandler<GetUserActivityQuery, List<UserActivityLogDto>>
    {
        private readonly IUnitOfWork _unitOfWork;

        public GetUserActivityQueryHandler(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<List<UserActivityLogDto>> Handle(GetUserActivityQuery request, CancellationToken cancellationToken)
        {
            var actionFilter = request.Action?.Trim();

            var logs = await _unitOfWork.UserActivityLogs.GetAllAsync(
                filter: x =>
                    (string.IsNullOrWhiteSpace(request.UserId) || x.UserId == request.UserId) &&
                    (string.IsNullOrWhiteSpace(actionFilter) || x.Action.Contains(actionFilter)),
                includes: q => q.OrderByDescending(x => x.CreatedAt).Take(request.Take));

            return logs.Select(x => new UserActivityLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                Email = x.Email,
                Action = x.Action,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                RequestPath = x.RequestPath,
                HttpMethod = x.HttpMethod,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                CreatedAt = x.CreatedAt
            }).ToList();
        }
    }
}
