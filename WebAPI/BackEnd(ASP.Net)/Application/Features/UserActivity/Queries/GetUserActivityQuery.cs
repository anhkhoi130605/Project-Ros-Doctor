using MediatR;
using Domain.Common;

namespace Application.Features.UserActivity.Queries
{
    public record GetUserActivityQuery(string? UserId, string? Action = null, int Take = 20) : IRequest<List<UserActivityLogDto>>;
    public record GetUserActivityPageQuery(int PageNumber = 1, int PageSize = 30, string? LogSearch = null, string? UserSearch = null, string? ActionMatches = null) : IRequest<PaginationResult<UserActivityLogDto>>;

    public class UserActivityLogDto
    {
        public string Id { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? Email { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? RequestPath { get; set; }
        public string? HttpMethod { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
