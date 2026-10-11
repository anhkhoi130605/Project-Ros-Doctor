using API.Controller.Common;
using Application.Interfaces;
using Application.Interfaces.ManageTransaction;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace API.Controller.Benchmarks;

[Route("api/benchmarks")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Engineering,Admin")]
public class BenchmarksController(IBenchmarkService service) : BaseController
{
    [HttpGet]
    public Task<IActionResult> List(int page = 1, int pageSize = 25, CancellationToken ct = default) => Run(async () =>
    {
        if (page is < 1 or > 100000 || pageSize is < 1 or > 100) return BadRequest(new { message = "Phân trang không hợp lệ." });
        return Ok(await service.ListAsync(page, pageSize, ct));
    });

    [HttpGet("{code}")]
    public Task<IActionResult> Get(string code, [FromServices] IUnitOfWork unitOfWork, CancellationToken ct) => Run(async () =>
    {
        var result = await service.GetAsync(code, ct);
        if (result == null) return NotFound(new { message = "Không tìm thấy benchmark." });
        var request = result.ChangeRequest;
        var names = new Dictionary<string, string?>();
        if (request != null)
        {
            var ids = new[] { request.RequestedBy, request.ReviewedBy }
                // List.Contains avoids C# 14's span overload for arrays, unsupported by EF parameterization.
                .Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            var people = await unitOfWork.User.SelectAsync(
                user => new BenchmarkPersonName(user.Id, user.FullName),
                filter: user => ids.Contains(user.Id), cancellationToken: ct);
            names = people.ToDictionary(person => person.Id, person => person.Name?.Trim());
        }
        // Names are response-only: retain IDs for authorization and do not duplicate user data in MongoDB.
        return Ok(new
        {
            result.Id, result.Code, result.Name, result.TestCases, result.CreatedAt,
            result.IsPublished, result.Version, result.UpdatedAt, result.Provenance,
            ChangeRequest = request == null ? null : new
            {
                request.RequestId, request.RequestType, request.ProposedData, request.Status,
                request.RequestedBy, RequestedByName = names.GetValueOrDefault(request.RequestedBy),
                request.RequestedAt, request.ReviewedBy,
                ReviewedByName = request.ReviewedBy == null ? null : names.GetValueOrDefault(request.ReviewedBy),
                request.ReviewedAt, request.ReviewNote, request.BaseVersion
            }
        });
    });

    public record BenchmarkPersonName(string Id, string? Name);

    [HttpPost("requests")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public Task<IActionResult> Submit(BenchmarkProposal request, CancellationToken ct) => Run(async () =>
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        await service.SubmitAsync(request, CurrentUserId, ct);
        return Ok(new { message = "Đã gửi đề xuất chờ Admin duyệt." });
    });

    [HttpPost("{code}/review")]
    [Authorize(Roles = "Admin")]
    public Task<IActionResult> Review(string code, BenchmarkDecision request, CancellationToken ct) => Run(async () =>
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        await service.ReviewAsync(code, request, CurrentUserId, ct);
        return Ok(new { message = "Đã lưu quyết định duyệt." });
    });

    public record CancelRequest(string RequestId);
    [HttpPost("{code}/cancel")]
    public Task<IActionResult> Cancel(string code, CancelRequest request, CancellationToken ct) => Run(async () =>
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        await service.CancelAsync(code, request.RequestId, CurrentUserId, ct);
        return Ok(new { message = "Đã hủy yêu cầu." });
    });

    private async Task<IActionResult> Run(Func<Task<IActionResult>> action)
    {
        try { return await action(); }
        catch (ArgumentException e) { return BadRequest(new { message = e.Message }); }
        catch (InvalidOperationException e) { return Conflict(new { message = e.Message }); }
        catch (MongoWriteException e) when (e.WriteError.Category == ServerErrorCategory.DuplicateKey)
        { return Conflict(new { message = "Mã benchmark đã tồn tại. Hãy tải lại và chọn cập nhật." }); }
        catch (MongoCommandException e) when (e.Code is 11000 or 85 or 86)
        { return Conflict(new { message = "Cần kiểm tra mã benchmark trùng hoặc index MongoDB trước khi gửi yêu cầu." }); }
        catch (MongoException)
        { return StatusCode(503, new { message = "Không thể truy cập MongoDB. Vui lòng thử lại." }); }
        catch (TimeoutException)
        { return StatusCode(503, new { message = "Kết nối MongoDB quá thời gian chờ." }); }
    }
}
