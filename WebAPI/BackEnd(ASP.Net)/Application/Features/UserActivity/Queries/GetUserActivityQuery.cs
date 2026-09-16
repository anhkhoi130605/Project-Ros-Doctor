using MediatR;

namespace Application.Features.UserActivity.Queries
{
    public record GetUserActivityQuery(string? UserId, string? Action = null, int Take = 20) : IRequest<List<UserActivityLogDto>>;

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
