using MediatR;

namespace Application.Features.UserActivity.Queries
{
    public record GetUserActivityByIdQuery(string Id) : IRequest<UserActivityLogDto?>;
}
