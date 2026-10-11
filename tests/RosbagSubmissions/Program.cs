using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using API.Controller.Rosbags;
using Application.Interfaces.Rosbag;
using Infrastructure.Services.Rosbag;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;
using Infrastructure.Persistence;
using Infrastructure.Migrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Schema = Infrastructure.Persistence.RosbagReviewSchemaInitializer;

// Explicit provider configuration: model and SQL generation never open a connection.
using var modelDb = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
    .UseMySql("Server=127.0.0.1;Database=not_used;User=test;Password=not_used;",
        new MySqlServerVersion(new Version(8, 4, 8))).Options);
var migrationSql = modelDb.GetService<IMigrator>().GenerateScript(
    "20260929160402_AlignMultiDbCleanArchitecture", "20261011000000_AddRosbagReview");
if (args.Contains("--migration-sql")) { Console.Write(migrationSql); return; }

var passed = 0;
void Check(bool condition, string name) { if (!condition) throw new Exception(name); Console.WriteLine("PASS " + name); passed++; }

var bag = new Rosbag();
Check(bag.ReviewStatus == RosbagReviewStatus.Approved, "legacy construction defaults to Approved");
bag.EnsureApprovedForAnalysis();
foreach (var reviewStatus in new[] { RosbagReviewStatus.Draft, RosbagReviewStatus.Submitted, RosbagReviewStatus.Rejected })
{
    bag.ReviewStatus = reviewStatus;
    try { bag.EnsureApprovedForAnalysis(); Check(false, reviewStatus + " cannot be analyzed"); }
    catch (InvalidOperationException) { Check(true, reviewStatus + " cannot be analyzed"); }
}
var entity = modelDb.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Rosbag))!;
Check(entity.GetTableName() == "rosbags", "review uses the original rosbags table");
Check(!modelDb.Model.GetEntityTypes().Any(e => e.GetTableName() == "rosbag_submissions"), "no submission table mapping remains");
var property = entity.FindProperty(nameof(Rosbag.ReviewStatus))!;
Check(property.GetDefaultValue()?.Equals(RosbagReviewStatus.Approved) == true, "database default preserves legacy approvals");
Check(property.Sentinel?.Equals(RosbagReviewStatus.Approved) == true, "Draft is not replaced by the Approved database default");
Check(property.GetTypeMapping().Converter!.ConvertToProvider(RosbagReviewStatus.Submitted)?.Equals("Submitted") == true, "review enum is stored as text");
Check(entity.GetForeignKeys().Single(f => f.Properties.Any(p => p.Name == "ReviewerId")).DeleteBehavior == DeleteBehavior.SetNull, "deleting reviewer cannot cascade-delete recording");
var operations = new AddRosbagReview().UpOperations;
Check(operations.OfType<AddColumnOperation>().Count() == 5 && operations.OfType<AddColumnOperation>().All(o => o.Table == "rosbags"), "migration adds exactly five columns to rosbags");
Check(operations.All(o => o is AddColumnOperation or CreateIndexOperation or AddForeignKeyOperation), "migration never creates or drops tables or existing columns");
Check(migrationSql.Contains("DEFAULT 'Approved'") && !migrationSql.Contains("rosbag_submissions"), "generated migration SQL keeps old rows approved without a new table");

var schemaColumns = new Schema.Column[]
{
    new("review_status", "varchar", 20, false, "Approved"),
    new("description", "varchar", 2000, true, null),
    new("reviewer_id", "varchar", 36, true, null),
    new("review_note", "varchar", 2000, true, null),
    new("reviewed_at", "datetime", null, true, null)
};
var schemaIndexes = new Schema.Index[]
{
    new("IX_rosbags_reviewer_id", "reviewer_id", true),
    new("IX_rosbags_review_status_CreatedAt", "review_status,CreatedAt", true)
};
var schemaKeys = new Schema.ForeignKey[] { new("FK_rosbags_Users_reviewer_id", "reviewer_id", "Users", "Id", "SET NULL") };
var initialPlan = Schema.Plan([], [], []);
Check(initialPlan.Count == 8 && initialPlan.Count(s => s.Contains("ADD COLUMN")) == 5, "startup plans exactly five columns, two indexes and reviewer FK");
Check(initialPlan.All(s => !s.Contains("DROP ") && !s.StartsWith("UPDATE ") && !s.StartsWith("DELETE ") && !s.Contains("__EFMigrationsHistory")), "startup never rewrites data or migration history");
Check(initialPlan[0].Contains("DEFAULT 'Approved'"), "startup keeps existing recordings approved");
Check(Schema.Plan(schemaColumns, schemaIndexes, schemaKeys).Count == 0, "second startup requires no DDL");
Check(Schema.Plan(schemaColumns[..2], [], []).Count == 6, "partial update resumes without adding existing columns again");
Check(Schema.Plan(schemaColumns, schemaIndexes, []).Count == 1, "failed FK creation can be retried without re-adding columns");
Check(Schema.Plan(schemaColumns, schemaIndexes.Select(i => i with { Name = "existing_" + i.Name }).ToArray(),
    schemaKeys.Select(k => k with { Name = "existing_reviewer_fk" }).ToArray()).Count == 0, "equivalent indexes and FK are not duplicated");
try { Schema.Plan([schemaColumns[0] with { Type = "int" }], [], []); Check(false, "incompatible existing column fails safely"); }
catch (InvalidOperationException) { Check(true, "incompatible existing column fails safely"); }
try { Schema.Plan([schemaColumns[0] with { Default = "Draft" }], [], []); Check(false, "unexpected default is not overwritten"); }
catch (InvalidOperationException) { Check(true, "unexpected default is not overwritten"); }
try { Schema.Plan(schemaColumns, [schemaIndexes[0] with { Columns = "user_id" }], []); Check(false, "incompatible index fails safely"); }
catch (InvalidOperationException) { Check(true, "incompatible index fails safely"); }
try { Schema.Plan(schemaColumns, schemaIndexes, [schemaKeys[0] with { DeleteRule = "CASCADE" }]); Check(false, "unsafe existing FK is never replaced silently"); }
catch (InvalidOperationException) { Check(true, "unsafe existing FK is never replaced silently"); }

// Real SQLite validator checks, using only a uniquely named temporary database.
var fixture = Path.Combine(Path.GetTempPath(), "submission-test-" + Guid.NewGuid().ToString("N") + ".db3");
try
{
    await using (var conn = new SqliteConnection($"Data Source={fixture};Pooling=False"))
    {
        await conn.OpenAsync();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "CREATE TABLE topics(id INTEGER, name TEXT, type TEXT, serialization_format TEXT); CREATE TABLE messages(id INTEGER, topic_id INTEGER, timestamp INTEGER, data BLOB);";
        await cmd.ExecuteNonQueryAsync();
    }
    try { await RosbagSubmissionService.ValidateBagAsync(fixture, default); Check(false, "empty bag rejected"); }
    catch (ArgumentException) { Check(true, "empty bag rejected"); }
    await using (var conn = new SqliteConnection($"Data Source={fixture};Pooling=False"))
    {
        await conn.OpenAsync(); var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO topics VALUES(1, '/scan', 'sensor_msgs/msg/LaserScan', 'cdr'); INSERT INTO messages VALUES(1, 1, 0, X'0000');";
        await cmd.ExecuteNonQueryAsync();
    }
    Check(await RosbagSubmissionService.ValidateBagAsync(fixture, default) == 1, "valid rosbag topic metadata checked without analysis");
    using var empty = new MemoryStream(); using var output = new MemoryStream();
    try { await RosbagSubmissionService.CopyLimitedAsync(empty, output, default); Check(false, "empty file rejected"); }
    catch (ArgumentException) { Check(true, "empty file rejected"); }
    var validationOnly = new RosbagSubmissionService(null!, null!, null!);
    foreach (var reason in new[] { "", "  ", new string('x', 2001) })
    {
        try { await validationOnly.ReviewAsync("test", "engineer", false, reason, default); Check(false, "invalid rejection reason rejected before database access"); }
        catch (ArgumentException) { Check(true, "invalid rejection reason rejected before database access"); }
    }
}
finally { File.Delete(fixture); }

// Actual controller authorization/routing with an isolated service double: no SQL, MongoDB, real users or AI.
var service = new SubmissionDouble();
var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", ContentRootPath = Path.GetTempPath() });
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddAuthentication("Bearer").AddScheme<AuthenticationSchemeOptions, TestAuth>("Bearer", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IRosbagSubmissionService>(service);
builder.Services.AddControllers().AddApplicationPart(typeof(BagSubmissionsController).Assembly);
var app = builder.Build();
app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
await app.StartAsync();
try
{
    using var client = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
    Check((await client.GetAsync("/api/bags/submissions")).StatusCode == HttpStatusCode.Unauthorized, "anonymous cannot list submissions");
    Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = true })).StatusCode == HttpStatusCode.Unauthorized, "anonymous cannot review submissions");
    client.DefaultRequestHeaders.Add("X-Test-Role", "User");
    client.DefaultRequestHeaders.Add("X-Test-User", "owner-one");
    using var body = new MultipartFormDataContent();
    body.Add(new ByteArrayContent([1]), "file", "robot.db3");
    body.Add(new StringContent("forged-owner"), "userId");
    Check((await client.PostAsync("/api/bags/submissions", body)).StatusCode == HttpStatusCode.Created, "user can submit");
    Check(service.LastUser == "owner-one", "owner comes from authenticated claim, not form");
    await client.GetAsync("/api/bags/submissions");
    Check(!service.CanReview && service.LastUser == "owner-one", "user list is owner-scoped");
    Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = true })).StatusCode == HttpStatusCode.Forbidden, "user cannot approve");
    Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = false, reason = "invalid" })).StatusCode == HttpStatusCode.Forbidden, "user cannot reject");
    Check(service.ReviewCalls == 0, "user attempts never reach review service");
    Check((await client.GetAsync("/api/bags/pending-review")).StatusCode == HttpStatusCode.Forbidden, "user cannot read engineer pending queue");
    foreach (var route in new[] { "/api/bags/inspect", "/api/bags/upload", "/api/bags/upload-and-inspect", "/api/bags", "/api/sessions/start" })
    {
        using var upload = new MultipartFormDataContent(); upload.Add(new ByteArrayContent([1]), "file", "robot.db3");
        var response = route.Contains("upload") ? await client.PostAsync(route, upload) : await client.PostAsJsonAsync(route, new { });
        Check(response.StatusCode == HttpStatusCode.Forbidden, "user cannot bypass review via " + route);
    }
    foreach (var role in new[] { "Engineering", "Admin" })
    {
        client.DefaultRequestHeaders.Remove("X-Test-Role"); client.DefaultRequestHeaders.Add("X-Test-Role", role);
        await client.GetAsync("/api/bags/submissions"); Check(service.CanReview, role + " sees shared review queue");
        Check((await client.GetAsync("/api/bags/pending-review")).StatusCode == HttpStatusCode.OK, role + " can read pending queue");
        Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = true })).StatusCode == HttpStatusCode.OK, role + " can approve");
        Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = false, reason = "Unreadable recording" })).StatusCode == HttpStatusCode.OK, role + " can reject with reason");
        service.ReviewResult = false;
        Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = true })).StatusCode == HttpStatusCode.Conflict, role + " receives conflict for already reviewed file");
        service.ReviewResult = true;
        service.InvalidReason = true;
        Check((await client.PostAsJsonAsync("/api/bags/test/review", new { approve = false })).StatusCode == HttpStatusCode.BadRequest, role + " receives validation error");
        service.InvalidReason = false;
        Check((await client.PostAsync("/api/bags/test/analyze", null)).StatusCode == HttpStatusCode.NotFound, role + " has no analysis endpoint in submission workflow");
    }
}
finally { await app.StopAsync(); await app.DisposeAsync(); }
Console.WriteLine($"{passed} checks passed; no real database used.");

public class TestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Role", out var role)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role.ToString()), new Claim(ClaimTypes.NameIdentifier, Request.Headers["X-Test-User"].ToString()) }, "Bearer");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "Bearer")));
    }
}

public class SubmissionDouble : IRosbagSubmissionService
{
    public string? LastUser;
    public bool CanReview;
    public int ReviewCalls;
    public bool ReviewResult = true;
    public bool InvalidReason;
    public Task<IReadOnlyList<RosbagSubmissionDto>> ListAsync(string userId, bool canReview, CancellationToken ct)
    { LastUser = userId; CanReview = canReview; return Task.FromResult<IReadOnlyList<RosbagSubmissionDto>>([]); }
    public Task<IReadOnlyList<RosbagSubmissionDto>> PendingAsync(CancellationToken ct)
        => Task.FromResult<IReadOnlyList<RosbagSubmissionDto>>([]);
    public Task<RosbagSubmissionDto> SubmitAsync(string userId, Stream file, string fileName, string description, CancellationToken ct)
    { LastUser = userId; return Task.FromResult(new RosbagSubmissionDto("test", userId, fileName, 1, description, "Submitted", 1, null, null, DateTime.UtcNow, null)); }
    public Task<bool> ReviewAsync(string id, string reviewerId, bool approve, string? reason, CancellationToken ct)
    {
        ReviewCalls++;
        if (InvalidReason) throw new ArgumentException("A rejection reason is required.");
        return Task.FromResult(ReviewResult);
    }
}
