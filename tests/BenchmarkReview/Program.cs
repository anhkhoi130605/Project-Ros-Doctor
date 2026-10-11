using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Application.Interfaces;
using Application.Interfaces.ManageTransaction;
using System.Text.Json;
using API.Controller.Benchmarks;
using Domain.Entities.NoSql;
using Infrastructure.Persistence.Mongo;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

var passed = 0;
void Check(bool ok, string name) { if (!ok) throw new Exception(name); Console.WriteLine("PASS " + name); passed++; }
async Task Conflict(Func<Task> operation, string name) {
    try { await operation(); throw new Exception("Expected conflict: " + name); }
    catch (InvalidOperationException) { Check(true, name); }
}
var store = new MemoryMongo();
var service = new BenchmarkService(store.Context);
var legacy = new BsonDocument { { "_id", ObjectId.GenerateNewId() }, { "code", "LEGACY" }, { "name", "Original" },
    { "test_cases", new BsonArray() }, { "seed_metadata", "keep" } };
store.Rows.Add(legacy);
var old = await service.GetAsync("LEGACY", default);
Check(old!.IsPublished && old.Version == 1, "legacy BSON defaults to published version 1");
var listing = await service.ListAsync(1, 25, default);
Check(listing.Total == 1 && listing.Items[0].IsPublished && listing.Items[0].Version == 1, "list exposes legacy defaults without loading proposed cases");
BenchmarkContent Content(string name) => new() { Name = name, TestCases = [new() {
    Code = "CASE-1", RosbagName = "test.db3", Topic = "/scan", StartSec = 0, EndSec = 2, Label = "drop", GroundTruth = "expected" }] };
var proposal = new BenchmarkProposal("NEW", "Create", 0, Content("Proposed"));
await service.SubmitAsync(proposal, "engineer", default);
var created = (await service.GetAsync("NEW", default))!;
Check(!created.IsPublished && created.TestCases.Count == 0 && created.ChangeRequest!.Status == "Pending", "create stays unpublished with isolated proposed data");
Check(store.UniqueIndexRequested, "writes request a unique code index");
await Conflict(() => service.SubmitAsync(proposal, "other", default), "second pending request is rejected");
await Conflict(() => service.CancelAsync("NEW", created.ChangeRequest!.RequestId, "other", default), "another Engineer cannot cancel");
await service.ReviewAsync("NEW", new(created.ChangeRequest!.RequestId, true, "OK"), "admin", default);
var approved = (await service.GetAsync("NEW", default))!;
Check(approved.IsPublished && approved.Version == 1 && approved.TestCases.Count == 1, "approval publishes data and increments version atomically");
Check(approved.ChangeRequest!.ReviewedBy == "admin", "decision records authenticated reviewer");
await Conflict(() => service.ReviewAsync("NEW", new(created.ChangeRequest.RequestId, true, null), "admin", default), "same request cannot be reviewed twice");
await Conflict(() => service.SubmitAsync(proposal, "engineer", default), "create with existing published code does not silently update");
await Conflict(() => service.SubmitAsync(new("NEW", "Update", 0, Content("Stale")), "engineer", default), "stale version cannot submit");
await service.SubmitAsync(new("NEW", "Update", 1, Content("Changed")), "engineer", default);
var pending = (await service.GetAsync("NEW", default))!;
Check(pending.Name == "Proposed" && pending.Version == 1, "pending update leaves published version intact");
try { await service.ReviewAsync("NEW", new(pending.ChangeRequest!.RequestId, false, " "), "admin", default); throw new Exception("Missing rejection note accepted"); }
catch (ArgumentException) { Check(true, "rejection requires reason"); }
await service.ReviewAsync("NEW", new(pending.ChangeRequest!.RequestId, false, "Needs evidence"), "admin", default);
var rejected = (await service.GetAsync("NEW", default))!;
Check(rejected.Name == "Proposed" && rejected.Version == 1 && rejected.ChangeRequest!.Status == "Rejected", "rejection preserves published content and revision");
await service.SubmitAsync(new("LEGACY", "Update", 1, Content("Legacy updated")), "engineer", default);
var legacyRequest = (await service.GetAsync("LEGACY", default))!.ChangeRequest!;
await service.ReviewAsync("LEGACY", new(legacyRequest.RequestId, true, null), "admin", default);
Check(legacy["seed_metadata"] == "keep" && legacy["version"] == 2, "legacy updates preserve unrelated fields and advance version");
await service.SubmitAsync(new("NEW", "Update", 1, Content("Conflict")), "engineer", default);
var race = (await service.GetAsync("NEW", default))!;
store.Rows.Single(x => x["code"] == "NEW")["version"] = 2;
await Conflict(() => service.ReviewAsync("NEW", new(race.ChangeRequest!.RequestId, true, null), "admin", default), "review compare-and-set rejects changed version");
await service.CancelAsync("NEW", race.ChangeRequest!.RequestId, "engineer", default);
Check((await service.GetAsync("NEW", default))!.ChangeRequest!.Status == "Cancelled", "owner can cancel pending request");
await service.SubmitAsync(new("REJECTED-NEW", "Create", 0, Content("Do not publish")), "engineer", default);
var newRequest = (await service.GetAsync("REJECTED-NEW", default))!.ChangeRequest!;
await service.ReviewAsync("REJECTED-NEW", new(newRequest.RequestId, false, "Missing evidence"), "admin", default);
Check(!(await service.GetAsync("REJECTED-NEW", default))!.IsPublished, "rejecting new dataset never publishes it");
await Conflict(() => service.SubmitAsync(new("REJECTED-NEW", "Create", 0, Content("Other")), "other", default), "other submitter cannot take over unpublished code");
await service.SubmitAsync(new("REJECTED-NEW", "Create", 0, Content("Corrected")), "engineer", default);
var resubmitted = (await service.GetAsync("REJECTED-NEW", default))!.ChangeRequest!;
Check(resubmitted.RequestId != newRequest.RequestId && resubmitted.Status == "Pending", "owner can resubmit rejected create with a new request ID");
await Conflict(() => service.ReviewAsync("REJECTED-NEW", new(newRequest.RequestId, true, null), "admin", default), "old browser request cannot approve resubmitted proposal");
var duplicate = Content("Invalid"); duplicate.TestCases.Add(duplicate.TestCases[0]);
try { BenchmarkProposalValidation.Validate(new("INVALID", "Create", 0, duplicate)); throw new Exception("Duplicate case accepted"); }
catch (ArgumentException) { Check(true, "duplicate case codes rejected"); }
var invalid = Content("Invalid"); invalid.TestCases[0].EndSec = double.NaN;
try { BenchmarkProposalValidation.Validate(new("INVALID", "Create", 0, invalid)); throw new Exception("NaN accepted"); }
catch (ArgumentException) { Check(true, "non-finite time rejected"); }

// Real HTTP controller/authorization with the actual service and an in-memory Mongo driver double.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", ContentRootPath = Path.GetTempPath() });
builder.Logging.ClearProviders(); builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddSingleton<IBenchmarkService>(service);
var nameLookups = 0;
var users = Proxy.Make<IUserRepository>((method, args) => {
    if (method.Name != "SelectAsync") throw new NotSupportedException(method.Name);
    nameLookups++;
    var filter = (System.Linq.Expressions.Expression<Func<Domain.Entities.Identity.User, bool>>)args![1]!;
    // Exercise the actual EF/MySQL translator: the in-memory filter alone cannot catch
    // C# 14 array Contains binding to ReadOnlySpan, which EF cannot parameterize.
    using var queryContext = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
        .UseMySql("Server=localhost;Database=translation_test;User=test", Microsoft.EntityFrameworkCore.ServerVersion.Parse("8.4.8-mysql")).Options);
    var query = queryContext.Users.Where(filter).Select(u => new BenchmarksController.BenchmarkPersonName(u.Id, u.FullName)).ToQueryString();
    Check(query.Contains("SELECT") && query.Contains("FullName"), "name lookup translates with real EF/MySQL provider without connecting");
    Check(filter.Compile()(new() { Id = "engineer" }) && !filter.Compile()(new() { Id = "unrelated" }),
        "name lookup is limited to request participants");
    return Task.FromResult(new List<BenchmarksController.BenchmarkPersonName> {
        new("engineer", "Đạt Engineer"), new("admin", "Quản trị viên") });
});
builder.Services.AddSingleton(Proxy.Make<IUnitOfWork>((method, _) => method.Name switch {
    "get_User" => users, "Dispose" => null, _ => throw new NotSupportedException(method.Name)
}));
builder.Services.AddAuthentication("Bearer").AddScheme<AuthenticationSchemeOptions, TestAuth>("Bearer", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddControllers().AddApplicationPart(typeof(BenchmarksController).Assembly);
var app = builder.Build(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
await app.StartAsync();
try {
    var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
    using var client = new HttpClient { BaseAddress = new Uri(address) };
    Check((await client.GetAsync("/api/benchmarks/NEW")).StatusCode == HttpStatusCode.Unauthorized, "anonymous cannot read management API");
    client.DefaultRequestHeaders.Add("X-Role", "User");
    Check((await client.GetAsync("/api/benchmarks/NEW")).StatusCode == HttpStatusCode.Forbidden, "User cannot read management API");
    Check((await client.PostAsJsonAsync("/api/benchmarks/requests", proposal)).StatusCode == HttpStatusCode.Forbidden, "User cannot submit benchmark proposals");
    client.DefaultRequestHeaders.Remove("X-Role"); client.DefaultRequestHeaders.Add("X-Role", "Engineering");
    Check((await client.GetAsync("/api/benchmarks/NEW")).StatusCode == HttpStatusCode.OK, "Engineer can read other datasets");
    var detail = (await client.GetFromJsonAsync<JsonElement>("/api/benchmarks/LEGACY")).GetProperty("changeRequest");
    Check(detail.GetProperty("requestedByName").GetString() == "Đạt Engineer" &&
        detail.GetProperty("reviewedByName").GetString() == "Quản trị viên", "Engineer can read participant names without admin user API");
    Check(detail.GetProperty("requestedBy").GetString() == "engineer", "response retains identity for ownership checks");
    Check(!store.Rows.Single(x => x["code"] == "LEGACY")["change_request"].AsBsonDocument.Contains("requested_by_name"),
        "display names are not written into MongoDB");
    var legacyReview = store.Rows.Single(x => x["code"] == "LEGACY")["change_request"].AsBsonDocument;
    legacyReview["reviewed_by"] = "deleted-account";
    var missingUser = (await client.GetFromJsonAsync<JsonElement>("/api/benchmarks/LEGACY")).GetProperty("changeRequest");
    Check(missingUser.GetProperty("reviewedByName").ValueKind == JsonValueKind.Null, "missing participant returns null instead of GUID as a name");
    legacyReview["reviewed_by"] = "admin";
    store.Rows.Add(new BsonDocument { { "_id", ObjectId.GenerateNewId() }, { "code", "NO-REQUEST" }, { "name", "No request" }, { "test_cases", new BsonArray() } });
    var previousLookups = nameLookups;
    var noRequest = await client.GetFromJsonAsync<JsonElement>("/api/benchmarks/NO-REQUEST");
    Check(noRequest.GetProperty("changeRequest").ValueKind == JsonValueKind.Null && nameLookups == previousLookups,
        "legacy dataset without review does not query user names");
    Check((await client.GetAsync("/api/benchmarks?page=1&pageSize=2")).StatusCode == HttpStatusCode.OK, "Engineer can browse paginated datasets");
    Check((await client.GetAsync("/api/benchmarks?page=0")).StatusCode == HttpStatusCode.BadRequest, "invalid pagination returns 400");
    Check((await client.PostAsJsonAsync("/api/benchmarks/NEW/review", new { requestId = "x", approve = true })).StatusCode == HttpStatusCode.Forbidden, "Engineer cannot approve by direct API call");
    Check((await client.PostAsJsonAsync("/api/benchmarks/requests", new BenchmarkProposal("HTTP", "Create", 0, Content("HTTP")))).StatusCode == HttpStatusCode.OK, "Engineer submits through API");
    var httpRequest = (await service.GetAsync("HTTP", default))!.ChangeRequest!;
    client.DefaultRequestHeaders.Remove("X-Role"); client.DefaultRequestHeaders.Add("X-Role", "Admin");
    Check((await client.PostAsJsonAsync("/api/benchmarks/HTTP/review", new { requestId = httpRequest.RequestId, approve = true })).StatusCode == HttpStatusCode.OK, "Admin approves through API");
    Check((await client.PostAsJsonAsync("/api/benchmarks/HTTP/review", new { requestId = httpRequest.RequestId, approve = true })).StatusCode == HttpStatusCode.Conflict, "duplicate HTTP review returns 409");
} finally { await app.StopAsync(); await app.DisposeAsync(); }
Console.WriteLine($"{passed} checks passed. No real database was contacted.");

public class TestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder) {
    protected override Task<AuthenticateResult> HandleAuthenticateAsync() {
        if (!Request.Headers.TryGetValue("X-Role", out var role)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Role, role.ToString()), new Claim(ClaimTypes.NameIdentifier, "engineer")], "Bearer");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "Bearer")));
    }
}

// Limited driver double: tests rendered Mongo filters/updates, not Mongo server indexing or storage.
public class Proxy : DispatchProxy {
    public Func<MethodInfo, object?[]?, object?> Call = null!;
    protected override object? Invoke(MethodInfo? method, object?[]? args) => Call(method!, args);
    public static T Make<T>(Func<MethodInfo, object?[]?, object?> call) where T : class {
        var proxy = Create<T, Proxy>(); ((Proxy)(object)proxy).Call = call; return proxy;
    }
}
public class Cursor<T>(IEnumerable<T> items) : IAsyncCursor<T> {
    private bool moved;
    public IEnumerable<T> Current => items;
    public bool MoveNext(CancellationToken ct = default) { var next = !moved; moved = true; return next; }
    public Task<bool> MoveNextAsync(CancellationToken ct = default) => Task.FromResult(MoveNext(ct));
    public void Dispose() { }
}
public class MemoryMongo {
    public List<BsonDocument> Rows = new();
    public bool UniqueIndexRequested;
    public IMongoDbContext Context { get; }
    private static RenderArgs<BenchmarkDatasetDocument> Render => new(BsonSerializer.SerializerRegistry.GetSerializer<BenchmarkDatasetDocument>(), BsonSerializer.SerializerRegistry);
    public MemoryMongo() {
        var indexes = Proxy.Make<IMongoIndexManager<BenchmarkDatasetDocument>>((method, args) => {
            if (method.Name == "CreateOneAsync") {
                UniqueIndexRequested = ((CreateIndexModel<BenchmarkDatasetDocument>)args![0]!).Options.Unique == true;
                return Task.FromResult("benchmark_code_unique");
            }
            if (method.Name == "CreateManyAsync") {
                var models = (IEnumerable<CreateIndexModel<BenchmarkDatasetDocument>>)args![0]!;
                UniqueIndexRequested = models.Any(x => x.Options.Unique == true);
                return Task.FromResult<IEnumerable<string>>(["benchmark_code_unique"]);
            }
            throw new NotSupportedException(method.Name);
        });
        var collection = Proxy.Make<IMongoCollection<BenchmarkDatasetDocument>>((method, args) => {
            if (method.Name == "get_Indexes") return indexes;
            if (method.Name == "get_DocumentSerializer") return Render.DocumentSerializer;
            if (method.Name == "get_Settings") return new MongoCollectionSettings();
            if (method.Name == "CountDocumentsAsync") return Task.FromResult((long)Rows.Count);
            if (method.Name == "FindAsync") {
                var filter = ((FilterDefinition<BenchmarkDatasetDocument>)args![0]!).Render(Render);
                if (method.GetGenericArguments()[0] == typeof(BsonDocument)) {
                    var options = (FindOptions<BenchmarkDatasetDocument, BsonDocument>)args[1]!;
                    // Render the projection so invalid mapping is caught, even without a Mongo server.
                    var projection = options.Projection.Render(Render).Document;
                    if (!projection["is_published"].AsBsonDocument.Contains("$ifNull")) throw new Exception("Legacy publication fallback missing");
                    var summaries = Rows.OrderBy(x => x["code"].AsString).Skip(options.Skip ?? 0).Take(options.Limit ?? 25).Select(x => new BsonDocument {
                        { "code", x["code"] }, { "name", x["name"] }, { "is_published", x.GetValue("is_published", true) },
                        { "version", x.GetValue("version", 1) }, { "total_cases", x["test_cases"].AsBsonArray.Count },
                        { "request_status", x.GetValue("change_request", BsonNull.Value) is BsonDocument req ? req["status"] : BsonNull.Value },
                        { "requested_by", x.GetValue("change_request", BsonNull.Value) is BsonDocument req2 ? req2["requested_by"] : BsonNull.Value },
                    }).ToList();
                    return Task.FromResult<IAsyncCursor<BsonDocument>>(new Cursor<BsonDocument>(summaries));
                }
                var values = Rows.Where(x => Match(x, filter)).Select(x => BsonSerializer.Deserialize<BenchmarkDatasetDocument>(x.DeepClone().AsBsonDocument)).ToList();
                return Task.FromResult<IAsyncCursor<BenchmarkDatasetDocument>>(new Cursor<BenchmarkDatasetDocument>(values));
            }
            if (method.Name == "InsertOneAsync") {
                var row = ((BenchmarkDatasetDocument)args![0]!).ToBsonDocument();
                if (Rows.Any(x => x["code"] == row["code"])) throw new InvalidOperationException("Duplicate");
                Rows.Add(row); return Task.CompletedTask;
            }
            if (method.Name == "UpdateOneAsync") {
                var filter = ((FilterDefinition<BenchmarkDatasetDocument>)args![0]!).Render(Render);
                var update = ((UpdateDefinition<BenchmarkDatasetDocument>)args[1]!).Render(Render).AsBsonDocument;
                var row = Rows.FirstOrDefault(x => Match(x, filter));
                if (row == null) return Task.FromResult<UpdateResult>(new UpdateResult.Acknowledged(0, 0, null));
                foreach (var op in update) foreach (var field in op.Value.AsBsonDocument) {
                    var parts = field.Name.Split('.'); var target = row;
                    foreach (var part in parts.SkipLast(1)) target = target[part].AsBsonDocument;
                    if (op.Name == "$set") target[parts.Last()] = field.Value.DeepClone();
                    else if (op.Name == "$unset") target.Remove(parts.Last());
                    else throw new NotSupportedException(op.Name);
                }
                return Task.FromResult<UpdateResult>(new UpdateResult.Acknowledged(1, 1, null));
            }
            throw new NotSupportedException(method.Name);
        });
        Context = Proxy.Make<IMongoDbContext>((method, _) => method.Name == "get_BenchmarkDatasets" ? collection : throw new NotSupportedException(method.Name));
    }
    private static bool Match(BsonDocument row, BsonDocument filter) {
        foreach (var field in filter) {
            if (field.Name == "$and") { if (!field.Value.AsBsonArray.All(x => Match(row, x.AsBsonDocument))) return false; continue; }
            if (field.Name == "$or") { if (!field.Value.AsBsonArray.Any(x => Match(row, x.AsBsonDocument))) return false; continue; }
            BsonValue actual = row; bool exists = true;
            foreach (var part in field.Name.Split('.')) {
                if (actual is BsonDocument doc && doc.TryGetValue(part, out var child)) actual = child;
                else { actual = BsonNull.Value; exists = false; break; }
            }
            if (field.Value is BsonDocument operators) {
                foreach (var op in operators) {
                    if (op.Name == "$exists" && exists != op.Value.AsBoolean) return false;
                    if (op.Name == "$ne" && actual == op.Value) return false;
                    if (op.Name == "$eq" && actual != op.Value) return false;
                }
            } else if (actual != field.Value) return false;
        }
        return true;
    }
}
