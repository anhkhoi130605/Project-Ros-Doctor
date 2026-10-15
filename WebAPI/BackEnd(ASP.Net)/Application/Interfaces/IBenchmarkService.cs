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
    private const int MinTestCases = 1;
    private const int MaxTestCases = 5000;
    private const int MaxBenchmarkNameLength = 200;
    private const int MaxProvenanceLength = 2000;
    private const int MaxCaseCodeLength = 100;
    private const int MaxRosbagNameLength = 255;
    private const int MaxTopicLength = 1000;
    private const int MaxLabelLength = 200;
    private const int MaxLegacyGroundTruthLength = 20000;

    private static readonly System.Text.RegularExpressions.Regex BenchmarkCodeRegex =
        new(@"^[A-Z0-9][A-Z0-9_-]{0,99}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static void Validate(BenchmarkProposal proposal)
    {
        if (string.IsNullOrWhiteSpace(proposal.Code) || !BenchmarkCodeRegex.IsMatch(proposal.Code))
            throw new ArgumentException("Mã benchmark chỉ gồm chữ in hoa, số, dấu - hoặc _ (tối đa 100 ký tự).");
        if (proposal.RequestType is not ("Create" or "Update") || proposal.BaseVersion < 0)
            throw new ArgumentException("Loại yêu cầu hoặc phiên bản không hợp lệ.");
        var data = proposal.ProposedData;
        if (data == null || string.IsNullOrWhiteSpace(data.Name) || data.Name.Length > MaxBenchmarkNameLength || data.Provenance?.Length > MaxProvenanceLength)
            throw new ArgumentException($"Nhập tên benchmark (tối đa {MaxBenchmarkNameLength} ký tự), nguồn dữ liệu tối đa {MaxProvenanceLength} ký tự.");
        if (data.TestCases == null || data.TestCases.Count is < MinTestCases or > MaxTestCases)
            throw new ArgumentException($"Bộ benchmark cần từ {MinTestCases} đến {MaxTestCases} trường hợp.");
        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var caseIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in data.TestCases)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.Code) || item.Code.Length > MaxCaseCodeLength || !codes.Add(item.Code.Trim()) ||
                string.IsNullOrWhiteSpace(item.RosbagName) || item.RosbagName.Length > MaxRosbagNameLength ||
                item.Topic == null || item.Topic.Length > MaxTopicLength || string.IsNullOrWhiteSpace(item.Label) || item.Label.Length > MaxLabelLength ||
                item.GroundTruth?.Length > MaxLegacyGroundTruthLength || !double.IsFinite(item.StartSec) || !double.IsFinite(item.EndSec) ||
                item.StartSec < 0 || item.EndSec < item.StartSec)
                throw new ArgumentException("Trường hợp không hợp lệ: kiểm tra mã trùng, rosbag, nhãn, độ dài và khoảng thời gian.");
            if (!caseIds.Add(item.CaseId ?? item.Code))
                throw new ArgumentException("case_id bị trùng / Duplicate case_id.");
            BenchmarkGroundTruthValidation.Validate(item);
        }
    }
}
