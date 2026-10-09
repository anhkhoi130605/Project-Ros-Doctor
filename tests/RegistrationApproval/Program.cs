using System.Collections;
using System.Linq.Expressions;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using API.Controller;
using Application.Features.Authentication.Login.Handler;
using Application.Features.Authentication.Register.Handler;
using Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Notifications;
using Domain.Entities.Identity;
using Domain.Entities.System;
using Domain.Enums;
using Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using static Domain.Enums.UserEnum;

// Deliberately isolated: no project appsettings, SQL, MongoDB, Redis or real accounts.
var users = new List<User>();
var roles = Enum.GetValues<RoleEnum>().Select(r => new Role { RoleName = r }).ToList();
var logs = new List<UserActivityLog>();
var unit = FakeProxy.Create<IUnitOfWork>((method, args) => method.Name switch
{
    "get_User" => FakeRepository.Create<IUserRepository, User>(users,
        user => user.Role = roles.Single(r => r.Id == user.RoleId)),
    "get_Roles" => FakeRepository.Create<IGenericRepository<Role>, Role>(roles),
    "get_UserActivityLogs" => FakeRepository.Create<IGenericRepository<UserActivityLog>, UserActivityLog>(logs),
    "SaveChangesAsync" => Task.FromResult(1),
    "Dispose" => null,
    _ => throw new NotSupportedException(method.Name)
});
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = [], EnvironmentName = "Testing", ContentRootPath = Path.GetTempPath()
});
builder.Configuration.Sources.Clear();
builder.Configuration.AddInMemoryCollection();
builder.Configuration["ConnectionStrings:DefaultConnection"] = "Server=127.0.0.1;Database=unused_test;User=unused;Password=unused";
builder.Configuration["Jwt:Key"] = "isolated-registration-test-key-not-for-production-123456789";
builder.Configuration["Jwt:Issuer"] = "isolated-test";
builder.Configuration["Jwt:Audience"] = "isolated-test";
builder.Configuration["Jwt:ExpiresMinutes"] = "60";
builder.Configuration["Authentication:Google:ClientId"] = "unused-test-client";
builder.Configuration["Authentication:Google:ClientSecret"] = "unused-test-secret";
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddControllers().AddApplicationPart(typeof(RegisterController).Assembly);
builder.Services.AddMediatR(config => config.RegisterServicesFromAssembly(typeof(RegisterCommandHandler).Assembly));
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.RemoveAll<IHostedService>();
builder.Services.RemoveAll<IUnitOfWork>();
builder.Services.AddSingleton(unit);
builder.Services.RemoveAll<IUserActivityLogService>();
var auditActions = new List<(string UserId, UserActionType Action, string? TargetId)>();
builder.Services.AddSingleton(FakeProxy.Create<IUserActivityLogService>((_, arguments) =>
{
    if (arguments?[0] is string userId && arguments[1] is UserActionType action)
        auditActions.Add((userId, action, arguments[2] as string));
    return Task.CompletedTask;
}));
builder.Services.RemoveAll<INotificationService>();
var notificationCalls = 0;
builder.Services.AddSingleton(FakeProxy.Create<INotificationService>((_, _) =>
{
    notificationCalls++;
    throw new InvalidOperationException("Cannot create a DbSet for 'Notification' because this type is not included in the model for the context.");
}));
builder.Services.AddRateLimiter(options => options.AddFixedWindowLimiter("auth-limiter", policy =>
{
    policy.PermitLimit = 1000; policy.Window = TimeSpan.FromMinutes(1);
}));
await using var app = builder.Build();
// Test-only exception mapping; production controllers/authentication/handlers are used unchanged.
app.Use(async (context, next) =>
{
    try { await next(); }
    catch (Exception exception) when (exception is ArgumentException or InvalidOperationException or KeyNotFoundException or UnauthorizedAccessException)
    {
        context.Response.StatusCode = exception is UnauthorizedAccessException ? 403 : 400;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message });
    }
});
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
await app.StartAsync();
var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
using var client = new HttpClient { BaseAddress = new Uri(address) };
using var scope = app.Services.CreateScope();
var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
var generator = scope.ServiceProvider.GetRequiredService<IJWTTokenGenerator>();
var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
var adminRole = roles.Single(r => r.RoleName == RoleEnum.Admin);
var admin = new User { Email = "admin@registration.test", FullName = "QA Admin", Role = adminRole,
    RoleId = adminRole.Id, Status = UserStatusEnum.Active, PasswordHash = hasher.HashPassword("Test-only-123456") };
users.Add(admin);
var adminToken = generator.GenerateToken(admin.Id, admin.Email, ["Admin"]);
var passed = 0;
void Check(bool condition, string name)
{
    if (!condition) throw new Exception("FAIL: " + name);
    Console.WriteLine("PASS: " + name); passed++;
}
await RegistrationEfRegression.RunAsync(hasher, generator, Check);
async Task<(HttpStatusCode Status, JsonElement Body)> Send(HttpMethod method, string path, object? body = null, string? token = null)
{
    using var request = new HttpRequestMessage(method, path);
    if (body != null) request.Content = JsonContent.Create(body);
    if (token != null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    using var response = await client.SendAsync(request);
    var text = await response.Content.ReadAsStringAsync();
    using var json = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
    return (response.StatusCode, json.RootElement.Clone());
}
object Registration(string email, string role) => new { email, role, fullName = "QA Account", password = "Test-only-123456", confirmPassword = "Test-only-123456" };
var userResult = await Send(HttpMethod.Post, "/api/auth/register", Registration("user@registration.test", "User"));
Check(userResult.Status == HttpStatusCode.OK && !userResult.Body.GetProperty("requiresApproval").GetBoolean(), "User registration is immediately active");
var userToken = userResult.Body.GetProperty("accessToken").GetString()!;
Check(!string.IsNullOrEmpty(userToken) && users.Single(u => u.Email == "user@registration.test").Status == UserStatusEnum.Active, "User receives real signed JWT");
var engineerResult = await Send(HttpMethod.Post, "/api/auth/register", Registration("engineer@registration.test", "Engineering"));
var engineer = users.Single(u => u.Email == "engineer@registration.test");
Check(engineerResult.Status == HttpStatusCode.OK && engineerResult.Body.GetProperty("requiresApproval").GetBoolean(), "Engineer registration requires approval");
Check(engineerResult.Body.GetProperty("accessToken").ValueKind == JsonValueKind.Null && engineer.Status == UserStatusEnum.PendingApproval, "Pending Engineer receives no JWT");
var pendingLogin = await Send(HttpMethod.Post, "/api/auth/login", new { email = engineer.Email, password = "Test-only-123456" });
Check(pendingLogin.Status == HttpStatusCode.Forbidden && pendingLogin.Body.GetProperty("code").GetString() == AccountPendingApprovalException.Code, "Password login rejects pending Engineer with stable error code");
Check(pendingLogin.Body.GetProperty("message").GetString() == "Tài khoản đã được đăng ký, vui lòng đợi Admin duyệt."
    && !pendingLogin.Body.TryGetProperty("accessToken", out _), "Pending login returns requested notice without issuing JWT");
var wrongLogin = await Send(HttpMethod.Post, "/api/auth/login", new { email = engineer.Email, password = "incorrect" });
Check(wrongLogin.Status != HttpStatusCode.OK, "Incorrect password cannot sign in");
Check(!wrongLogin.Body.TryGetProperty("code", out _), "Wrong password does not expose approval state");
var approvalPath = $"/api/admin/members/{engineer.Id}/approve-engineer";
Check((await Send(HttpMethod.Post, approvalPath)).Status == HttpStatusCode.Unauthorized, "Anonymous cannot approve");
Check((await Send(HttpMethod.Post, approvalPath, token: userToken)).Status == HttpStatusCode.Forbidden, "User cannot approve");
var pendingToken = generator.GenerateToken(engineer.Id, engineer.Email, ["Engineering"]);
Check((await Send(HttpMethod.Get, "/api/admin/members", token: pendingToken)).Status == HttpStatusCode.Unauthorized, "JWT middleware rejects even a signed token for pending account");
var members = await Send(HttpMethod.Get, "/api/admin/members", token: adminToken);
var pendingMember = members.Body.EnumerateArray().Single(m => m.GetProperty("id").GetString() == engineer.Id);
Check(pendingMember.GetProperty("status").GetString() == "PendingApproval" && pendingMember.GetProperty("accountStatus").GetString() == "PendingApproval", "Admin sees approval state, not misleading Online state");
Check((await Send(HttpMethod.Put, $"/api/admin/members/{engineer.Id}/role", new { role = "User" }, adminToken)).Status != HttpStatusCode.OK
    && engineer.Status == UserStatusEnum.PendingApproval, "Role editing cannot bypass pending approval");
Check((await Send(HttpMethod.Post, approvalPath, token: adminToken)).Status == HttpStatusCode.OK && engineer.Status == UserStatusEnum.Active, "Admin approval activates Engineer");
Check((await Send(HttpMethod.Post, approvalPath, token: adminToken)).Status == HttpStatusCode.OK, "Repeated approval is idempotent");
Check(notificationCalls == 0, "Approval does not depend on the missing Notification model, including retries");
Check(auditActions.Any(a => a.UserId == admin.Id && a.Action == UserActionType.AssignRole && a.TargetId == engineer.Id),
    "Approval still records the Admin and target account in audit log");
var approvedLogin = await Send(HttpMethod.Post, "/api/auth/login", new { email = engineer.Email, password = "Test-only-123456" });
Check(approvedLogin.Status == HttpStatusCode.OK && approvedLogin.Body.GetProperty("user").GetProperty("role").GetString() == "Engineering"
    && !string.IsNullOrEmpty(approvedLogin.Body.GetProperty("accessToken").GetString()), "Approved Engineer signs in with Engineering role");
var approvedToken = approvedLogin.Body.GetProperty("accessToken").GetString()!;
Check((await Send(HttpMethod.Post, approvalPath, token: approvedToken)).Status == HttpStatusCode.Forbidden, "Engineer cannot approve accounts");
foreach (var invalidRole in new[] { "Admin", "2", "99", "Manager", "" })
{
    var count = users.Count;
    var response = await Send(HttpMethod.Post, "/api/auth/register", Registration("invalid@registration.test", invalidRole));
    Check(response.Status == HttpStatusCode.BadRequest && users.Count == count, "Public registration rejects role: " + invalidRole);
}
Check((await Send(HttpMethod.Post, "/api/auth/register", Registration(engineer.Email, "User"))).Status == HttpStatusCode.BadRequest, "Duplicate email does not change existing account");
var legacy = await Send(HttpMethod.Post, "/api/auth/register", new { email = "legacy@registration.test", fullName = "QA Legacy", password = "Test-only-123456" });
Check(legacy.Status == HttpStatusCode.OK && !legacy.Body.GetProperty("requiresApproval").GetBoolean(), "Legacy registration without role remains User");
var alias = await Send(HttpMethod.Post, "/api/auth/register", Registration("alias@registration.test", "Engineer"));
Check(alias.Status == HttpStatusCode.OK && alias.Body.GetProperty("requiresApproval").GetBoolean(), "Engineer alias maps to Engineering pending state");
var aliasUser = users.Single(u => u.Email == "alias@registration.test");
aliasUser.IsBanned = true;
Check((await Send(HttpMethod.Post, $"/api/admin/members/{aliasUser.Id}/approve-engineer", token: adminToken)).Status != HttpStatusCode.OK
    && aliasUser.Status == UserStatusEnum.PendingApproval, "Approval cannot unlock banned Engineer");
engineer.Status = UserStatusEnum.Inactive;
Check((await Send(HttpMethod.Post, approvalPath, token: adminToken)).Status != HttpStatusCode.OK, "Approval cannot reactivate unrelated inactive account");
engineer.Status = UserStatusEnum.Active;
ClaimsPrincipal GoogleIdentity(string email) => new(new ClaimsIdentity([new Claim(ClaimTypes.Email, email), new Claim(ClaimTypes.Name, "QA Google")], "test-google"));
var googlePending = await mediator.Send(new GoogleLoginCommand(GoogleIdentity("google-engineer@registration.test"), RoleEnum.Engineering, true));
Check(googlePending.RequiresApproval && string.IsNullOrEmpty(googlePending.AccessToken), "Google Engineer registration also receives no token");
try
{
    await mediator.Send(new GoogleLoginCommand(GoogleIdentity("google-engineer@registration.test")));
    Check(false, "Google login cannot bypass pending approval");
}
catch (AccountPendingApprovalException) { Check(true, "Google login cannot bypass pending approval"); }
var googleExisting = await mediator.Send(new GoogleLoginCommand(GoogleIdentity("user@registration.test"), RoleEnum.Engineering, true));
Check(!googleExisting.RequiresApproval && googleExisting.User.Role == "User", "Google registration does not upgrade an existing User");
var googleUser = await mediator.Send(new GoogleLoginCommand(GoogleIdentity("google-user@registration.test"), RoleEnum.User, true));
Check(!googleUser.RequiresApproval && !string.IsNullOrEmpty(googleUser.AccessToken), "Google User registration is immediately active");
var deleteRegistration = await Send(HttpMethod.Post, "/api/auth/register", Registration("delete-user@registration.test", "User"));
var deletedUser = users.Single(u => u.Email == "delete-user@registration.test");
var deletedUserToken = deleteRegistration.Body.GetProperty("accessToken").GetString()!;
var deletePath = $"/api/admin/members/{deletedUser.Id}";
Check((await Send(HttpMethod.Delete, deletePath)).Status == HttpStatusCode.Unauthorized, "Anonymous cannot delete members");
Check((await Send(HttpMethod.Delete, deletePath, token: userToken)).Status == HttpStatusCode.Forbidden, "User cannot delete members");
Check((await Send(HttpMethod.Delete, deletePath, token: approvedToken)).Status == HttpStatusCode.Forbidden, "Engineer cannot delete members");
Check(deletedUser.DeletedAt == null, "Unauthorized deletion leaves target unchanged");
Check((await Send(HttpMethod.Delete, $"/api/admin/members/{admin.Id}", token: adminToken)).Status != HttpStatusCode.OK
    && admin.DeletedAt == null, "Admin cannot delete their own signed-in account");
Check((await Send(HttpMethod.Delete, "/api/admin/members/nonexistent-test-id", token: adminToken)).Status != HttpStatusCode.OK,
    "Missing member cannot produce false delete success");
var deleteResult = await Send(HttpMethod.Delete, deletePath, token: adminToken);
Check(deleteResult.Status == HttpStatusCode.OK && deleteResult.Body.GetProperty("deleted").GetBoolean()
    && deleteResult.Body.GetProperty("id").GetString() == deletedUser.Id, "Admin DELETE acknowledges persisted deletion");
Check(users.Contains(deletedUser) && deletedUser.DeletedAt != null && deletedUser.UpdatedBy == admin.Id
    && deletedUser.Status == UserStatusEnum.Inactive, "Soft deletion preserves record and marks author/time/inactive status");
for (var reload = 0; reload < 2; reload++)
{
    var refreshed = await Send(HttpMethod.Get, "/api/admin/members", token: adminToken);
    Check(refreshed.Status == HttpStatusCode.OK && !refreshed.Body.EnumerateArray().Any(m => m.GetProperty("id").GetString() == deletedUser.Id),
        $"Fresh member request {reload + 1} excludes deleted account");
}
Check((await Send(HttpMethod.Delete, deletePath, token: adminToken)).Status == HttpStatusCode.OK, "Repeated deletion is safe and idempotent");
Check((await Send(HttpMethod.Post, "/api/auth/login", new { email = deletedUser.Email, password = "Test-only-123456" })).Status != HttpStatusCode.OK,
    "Deleted account cannot sign in with correct password");
Check((await Send(HttpMethod.Get, "/api/admin/members", token: deletedUserToken)).Status == HttpStatusCode.Unauthorized,
    "Existing JWT is rejected after deletion");
try
{
    await mediator.Send(new GoogleLoginCommand(GoogleIdentity(deletedUser.Email)));
    Check(false, "Existing deleted account cannot bypass sign-in guard via Google");
}
catch (UnauthorizedAccessException) { Check(true, "Existing deleted account cannot bypass sign-in guard via Google"); }
Check((await Send(HttpMethod.Post, "/api/auth/register", Registration(deletedUser.Email, "User"))).Status != HttpStatusCode.OK,
    "Registration does not silently restore deleted account or its historical data");
Check(notificationCalls == 0 && auditActions.Any(a => a.UserId == admin.Id && a.Action == UserActionType.DeleteUser && a.TargetId == deletedUser.Id),
    "Deletion records audit without depending on missing Notification model");
await Send(HttpMethod.Post, "/api/auth/register", Registration("delete-pending@registration.test", "Engineering"));
var deletedPending = users.Single(u => u.Email == "delete-pending@registration.test");
Check((await Send(HttpMethod.Delete, $"/api/admin/members/{deletedPending.Id}", token: adminToken)).Status == HttpStatusCode.OK,
    "Admin can delete an Engineer awaiting approval");
Check((await Send(HttpMethod.Post, $"/api/admin/members/{deletedPending.Id}/approve-engineer", token: adminToken)).Status != HttpStatusCode.OK
    && deletedPending.DeletedAt != null, "Approval cannot revive deleted account");
Check((await Send(HttpMethod.Put, $"/api/admin/members/{deletedPending.Id}/role", new { role = "User" }, adminToken)).Status != HttpStatusCode.OK,
    "Role edit cannot revive deleted account");
var staleAdmin = new User { Email = "stale-admin@registration.test", RoleId = adminRole.Id, Status = UserStatusEnum.Active };
users.Add(staleAdmin);
var staleAdminToken = generator.GenerateToken(staleAdmin.Id, staleAdmin.Email, ["Admin"]);
staleAdmin.RoleId = roles.Single(r => r.RoleName == RoleEnum.User).Id;
var liveTarget = users.Single(u => u.Email == "user@registration.test");
Check((await Send(HttpMethod.Delete, $"/api/admin/members/{liveTarget.Id}", token: staleAdminToken)).Status != HttpStatusCode.OK
    && liveTarget.DeletedAt == null, "Stale Admin JWT cannot delete after database role was downgraded");
var deletionDates = users.Select(u => u.DeletedAt).ToArray();
foreach (var u in users) u.DeletedAt = DateTime.UtcNow;
Check((await mediator.Send(new GetMembersQuery())).Count == 0, "All-deleted member query returns authoritative empty list");
for (var index = 0; index < users.Count; index++) users[index].DeletedAt = deletionDates[index];
await MemberDeletionEfRegression.RunAsync(Check);
Console.WriteLine($"RESULT: {passed} passed, 0 failed; isolated in-memory repositories, no real DB/OAuth provider.");
if (args.Contains("--serve"))
{
    Console.WriteLine("TEST_SERVER: " + address);
    await Task.Delay(Timeout.Infinite);
}
await app.StopAsync();

public class FakeProxy : DispatchProxy
{
    public Func<MethodInfo, object?[]?, object?> Handler = null!;
    protected override object? Invoke(MethodInfo? method, object?[]? args) => Handler(method!, args);
    public static T Create<T>(Func<MethodInfo, object?[]?, object?> handler) where T : class
    {
        var proxy = DispatchProxy.Create<T, FakeProxy>();
        ((FakeProxy)(object)proxy).Handler = handler;
        return proxy;
    }
    public static object EmptyTask(Type returnType)
    {
        if (returnType == typeof(Task)) return Task.CompletedTask;
        var type = returnType.GetGenericArguments().Single();
        return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(type)
            .Invoke(null, [type.IsValueType ? Activator.CreateInstance(type) : null])!;
    }
}
public static class FakeRepository
{
    public static TInterface Create<TInterface, T>(List<T> rows, Action<T>? hydrate = null) where TInterface : class where T : Domain.Common.BaseEntity =>
        FakeProxy.Create<TInterface>((method, args) =>
        {
            var predicate = args?.FirstOrDefault() as Expression<Func<T, bool>>;
            var query = predicate == null ? rows : rows.Where(predicate.Compile());
            object? result = method.Name switch
            {
                "GetAllAsync" => query.ToArray().AsEnumerable(),
                "GetAsync" => query.FirstOrDefault(),
                "GetByIdAsync" => rows.FirstOrDefault(r => r.Id == (string?)args![0]),
                "FindByEmailAsync" => rows.Cast<User>().FirstOrDefault(u => string.Equals(u.Email, (string?)args![0], StringComparison.OrdinalIgnoreCase)),
                "ExistsByEmailAsync" => rows.Cast<User>().Any(u => string.Equals(u.Email, (string?)args![0], StringComparison.OrdinalIgnoreCase)),
                "CountAsync" => query.Count(),
                "CreateAsync" => Add((T)args![0]!),
                "UpdateAsync" => null,
                _ => throw new NotSupportedException(method.Name)
            };
            if (result is T entity) hydrate?.Invoke(entity);
            if (method.ReturnType == typeof(Task)) return Task.CompletedTask;
            return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(method.ReturnType.GetGenericArguments()[0]).Invoke(null, [result]);
            object? Add(T entity) { rows.Add(entity); return null; }
        });
}
