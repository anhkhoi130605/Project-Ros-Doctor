namespace Application.Interfaces.Rosbag;

public record RosbagSubmissionDto(string Id, string UserId, string FileName, long SizeBytes,
    string Description, string ReviewStatus, int TopicCount, string? ReviewerId, string? ReviewNote,
    DateTime CreatedAt, DateTime? ReviewedAt);

public interface IRosbagSubmissionService
{
    Task<IReadOnlyList<RosbagSubmissionDto>> ListAsync(string userId, bool canReview, CancellationToken ct);
    Task<IReadOnlyList<RosbagSubmissionDto>> PendingAsync(CancellationToken ct);
    Task<RosbagSubmissionDto> SubmitAsync(string userId, Stream file, string fileName, string description, CancellationToken ct);
    Task<bool> ReviewAsync(string id, string reviewerId, bool approve, string? reason, CancellationToken ct);
}
