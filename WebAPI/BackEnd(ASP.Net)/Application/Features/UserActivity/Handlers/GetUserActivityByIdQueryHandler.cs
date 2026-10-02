using Application.Features.UserActivity.Queries;
using Application.Interfaces.ManageTransaction;
using MediatR;

namespace Application.Features.UserActivity.Handlers
{
    public class GetUserActivityByIdQueryHandler : IRequestHandler<GetUserActivityByIdQuery, UserActivityLogDto?>
    {
        private readonly IUnitOfWork _unitOfWork;

        public GetUserActivityByIdQueryHandler(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<UserActivityLogDto?> Handle(GetUserActivityByIdQuery request, CancellationToken cancellationToken)
        {
            var log = await _unitOfWork.UserActivityLogs.GetByIdAsync(request.Id);
            if (log == null) return null;

            return new UserActivityLogDto
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
            };
        }
    }
}
