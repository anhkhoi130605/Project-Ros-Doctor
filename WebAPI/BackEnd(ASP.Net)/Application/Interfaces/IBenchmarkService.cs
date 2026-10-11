using Domain.Entities.NoSql;

namespace Application.Interfaces;

public record BenchmarkProposal(string Code, string RequestType, int BaseVersion, BenchmarkContent ProposedData);
public record BenchmarkDecision(string RequestId, bool Approve, string? Note);
public record BenchmarkSummary(string Code, string Name, bool IsPublished, int Version, int TotalCases,
    string? RequestStatus, string? RequestedBy);
public record BenchmarkPage(IReadOnlyList<BenchmarkSummary> Items, long Total, int Page, int PageSize);

public interface IBenchmarkService
{
    Task<BenchmarkPage> ListAsync(int page, int pageSize, CancellationToken ct);
    Task<BenchmarkDatasetDocument?> GetAsync(string code, CancellationToken ct);
    Task SubmitAsync(BenchmarkProposal proposal, string userId, CancellationToken ct);
    Task ReviewAsync(string code, BenchmarkDecision decision, string adminId, CancellationToken ct);
    Task CancelAsync(string code, string requestId, string userId, CancellationToken ct);
}

public static class BenchmarkProposalValidation
{
    public static void Validate(BenchmarkProposal proposal)
    {
        if (string.IsNullOrWhiteSpace(proposal.Code) ||
            !System.Text.RegularExpressions.Regex.IsMatch(proposal.Code, @"^[A-Z0-9][A-Z0-9_-]{0,99}$"))
            throw new ArgumentException("Mã benchmark chỉ gồm chữ in hoa, số, dấu - hoặc _ (tối đa 100 ký tự).");
        if (proposal.RequestType is not ("Create" or "Update") || proposal.BaseVersion < 0)
            throw new ArgumentException("Loại yêu cầu hoặc phiên bản không hợp lệ.");
        var data = proposal.ProposedData;
        if (data == null || string.IsNullOrWhiteSpace(data.Name) || data.Name.Length > 200 || data.Provenance?.Length > 2000)
            throw new ArgumentException("Nhập tên benchmark (tối đa 200 ký tự), nguồn dữ liệu tối đa 2000 ký tự.");
        if (data.TestCases == null || data.TestCases.Count is < 1 or > 5000)
            throw new ArgumentException("Bộ benchmark cần từ 1 đến 5000 trường hợp.");
        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in data.TestCases)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.Code) || item.Code.Length > 100 || !codes.Add(item.Code.Trim()) ||
                string.IsNullOrWhiteSpace(item.RosbagName) || item.RosbagName.Length > 255 ||
                item.Topic == null || item.Topic.Length > 1000 || string.IsNullOrWhiteSpace(item.Label) || item.Label.Length > 200 ||
                item.GroundTruth?.Length > 20000 || !double.IsFinite(item.StartSec) || !double.IsFinite(item.EndSec) ||
                item.StartSec < 0 || item.EndSec < item.StartSec)
                throw new ArgumentException("Trường hợp không hợp lệ: kiểm tra mã trùng, rosbag, nhãn, độ dài và khoảng thời gian.");
        }
    }
}
