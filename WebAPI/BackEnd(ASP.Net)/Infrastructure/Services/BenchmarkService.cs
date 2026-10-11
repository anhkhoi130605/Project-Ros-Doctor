using Application.Interfaces;
using Domain.Entities.NoSql;
using Infrastructure.Persistence.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Infrastructure.Services;

public class BenchmarkService(IMongoDbContext context) : IBenchmarkService
{
    private IMongoCollection<BenchmarkDatasetDocument> Collection => context.BenchmarkDatasets
        ?? throw new InvalidOperationException("MongoDB chưa được cấu hình.");
    private static readonly FilterDefinitionBuilder<BenchmarkDatasetDocument> F = Builders<BenchmarkDatasetDocument>.Filter;
    private static readonly UpdateDefinitionBuilder<BenchmarkDatasetDocument> U = Builders<BenchmarkDatasetDocument>.Update;

    public async Task<BenchmarkPage> ListAsync(int page, int pageSize, CancellationToken ct)
    {
        var total = await Collection.CountDocumentsAsync(F.Empty, cancellationToken: ct);
        var rows = await Collection.Find(F.Empty).SortBy(x => x.Code).Skip((page - 1) * pageSize).Limit(pageSize)
            .Project<BsonDocument>(new BsonDocument {
                { "code", 1 }, { "name", 1 }, { "is_published", new BsonDocument("$ifNull", new BsonArray { "$is_published", true }) },
                { "version", new BsonDocument("$ifNull", new BsonArray { "$version", 1 }) },
                { "total_cases", new BsonDocument("$size", new BsonDocument("$ifNull", new BsonArray { "$test_cases", new BsonArray() })) },
                { "request_status", "$change_request.status" }, { "requested_by", "$change_request.requested_by" },
            }).ToListAsync(ct);
        var items = rows.Select(x => new BenchmarkSummary(x["code"].AsString, x.GetValue("name", "").AsString,
            x["is_published"].AsBoolean, x["version"].ToInt32(), x["total_cases"].ToInt32(),
            x.GetValue("request_status", BsonNull.Value).IsBsonNull ? null : x["request_status"].AsString,
            x.GetValue("requested_by", BsonNull.Value).IsBsonNull ? null : x["requested_by"].AsString)).ToList();
        return new(items, total, page, pageSize);
    }

    public Task<BenchmarkDatasetDocument?> GetAsync(string code, CancellationToken ct) =>
        Collection.Find(x => x.Code == code).FirstOrDefaultAsync(ct)!;

    // Missing version is the legacy, published revision 1.
    private static FilterDefinition<BenchmarkDatasetDocument> Revision(int version) => version == 1
        ? F.Eq(x => x.Version, 1) | F.Exists("version", false) : F.Eq(x => x.Version, version);

    public async Task SubmitAsync(BenchmarkProposal proposal, string userId, CancellationToken ct)
    {
        BenchmarkProposalValidation.Validate(proposal);
        // A database uniqueness constraint is necessary, even when two Engineers submit simultaneously.
        // Existing duplicate codes must be reconciled manually; never silently overwrite one.
        await Collection.Indexes.CreateOneAsync(new CreateIndexModel<BenchmarkDatasetDocument>(
            Builders<BenchmarkDatasetDocument>.IndexKeys.Ascending(x => x.Code),
            new CreateIndexOptions { Unique = true, Name = "benchmark_code_unique" }), cancellationToken: ct);
        var current = await GetAsync(proposal.Code, ct);
        if (proposal.RequestType == "Create" && current?.IsPublished == true)
            throw new InvalidOperationException("Mã đã tồn tại. Hãy mở benchmark và chọn đề xuất cập nhật.");
        if (proposal.RequestType == "Update" && current?.IsPublished != true)
            throw new InvalidOperationException("Không có benchmark chính thức để cập nhật.");
        if (current?.ChangeRequest?.Status == "Pending")
            throw new InvalidOperationException("Benchmark đang có một yêu cầu chờ duyệt.");
        if (proposal.BaseVersion != (current?.Version ?? 0))
            throw new InvalidOperationException("Phiên bản đã thay đổi. Hãy tải lại benchmark trước khi gửi.");
        if (current is { IsPublished: false } && current.ChangeRequest?.RequestedBy != userId)
            throw new InvalidOperationException("Mã này đang được giữ bởi yêu cầu của Engineer khác.");
        var now = DateTime.UtcNow;
        var request = new BenchmarkChangeRequest {
            RequestId = Guid.NewGuid().ToString("N"), RequestType = proposal.RequestType,
            ProposedData = proposal.ProposedData, RequestedBy = userId, RequestedAt = now,
            BaseVersion = proposal.BaseVersion,
        };
        if (current == null)
        {
            await Collection.InsertOneAsync(new BenchmarkDatasetDocument {
                Id = ObjectId.GenerateNewId().ToString(), Code = proposal.Code, Name = proposal.ProposedData.Name,
                IsPublished = false, Version = 0, UpdatedAt = now, ChangeRequest = request,
            }, cancellationToken: ct);
            return;
        }
        var filter = F.Eq(x => x.Id, current.Id) & Revision(current.Version)
            & F.Ne("change_request.status", "Pending")
            & F.Eq("change_request.request_id", (BsonValue?)current.ChangeRequest?.RequestId ?? BsonNull.Value);
        var update = U.Set(x => x.ChangeRequest, request).Set(x => x.UpdatedAt, now)
            .Set(x => x.IsPublished, current.IsPublished).Set(x => x.Version, current.Version);
        if ((await Collection.UpdateOneAsync(filter, update, cancellationToken: ct)).ModifiedCount != 1)
            throw new InvalidOperationException("Yêu cầu đã thay đổi. Hãy tải lại danh sách.");
    }

    public async Task ReviewAsync(string code, BenchmarkDecision decision, string adminId, CancellationToken ct)
    {
        if (decision.Note?.Length > 2000 || (!decision.Approve && string.IsNullOrWhiteSpace(decision.Note)))
            throw new ArgumentException("Cần lý do từ chối; ghi chú tối đa 2000 ký tự.");
        var current = await GetAsync(code, ct);
        var request = current?.ChangeRequest;
        if (current == null || request?.Status != "Pending" || request.RequestId != decision.RequestId)
            throw new InvalidOperationException("Yêu cầu không tồn tại hoặc đã được xử lý.");
        var filter = F.Eq(x => x.Id, current.Id) & Revision(request.BaseVersion)
            & F.Eq("change_request.request_id", decision.RequestId) & F.Eq("change_request.status", "Pending");
        var now = DateTime.UtcNow;
        var update = U.Set("change_request.status", decision.Approve ? "Approved" : "Rejected")
            .Set("change_request.reviewed_by", adminId).Set("change_request.reviewed_at", now)
            .Set("change_request.review_note", decision.Note?.Trim()).Set(x => x.UpdatedAt, now)
            .Set(x => x.IsPublished, current.IsPublished).Set(x => x.Version, current.Version);
        if (decision.Approve)
        {
            BenchmarkProposalValidation.Validate(new(code, request.RequestType, request.BaseVersion, request.ProposedData));
            update = U.Combine(update, U.Set(x => x.Name, request.ProposedData.Name)
                .Set(x => x.Provenance, request.ProposedData.Provenance).Set(x => x.TestCases, request.ProposedData.TestCases)
                .Set("total_cases", request.ProposedData.TestCases.Count)
                .Set(x => x.IsPublished, true).Set(x => x.Version, checked(request.BaseVersion + 1))
                .Unset("group_distribution").Unset("fault_type_distribution"));
        }
        if ((await Collection.UpdateOneAsync(filter, update, cancellationToken: ct)).ModifiedCount != 1)
            throw new InvalidOperationException("Dữ liệu hoặc quyết định đã thay đổi. Hãy tải lại để kiểm tra.");
    }

    public async Task CancelAsync(string code, string requestId, string userId, CancellationToken ct)
    {
        var filter = F.Eq(x => x.Code, code) & F.Eq("change_request.request_id", requestId)
            & F.Eq("change_request.status", "Pending") & F.Eq("change_request.requested_by", userId);
        var update = U.Set("change_request.status", "Cancelled").Set(x => x.UpdatedAt, DateTime.UtcNow);
        if ((await Collection.UpdateOneAsync(filter, update, cancellationToken: ct)).ModifiedCount != 1)
            throw new InvalidOperationException("Chỉ người gửi có thể hủy yêu cầu vẫn đang chờ duyệt.");
    }
}
