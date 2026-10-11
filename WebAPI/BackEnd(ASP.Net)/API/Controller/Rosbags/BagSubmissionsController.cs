using API.Controller.Common;
using Application.Interfaces.Rosbag;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Rosbags;

[Route("api/bags")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "User,Engineering,Admin")]
public class BagSubmissionsController(IRosbagSubmissionService submissions) : BaseController
{
    [HttpGet("submissions")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        return Ok(await submissions.ListAsync(CurrentUserId, User.IsInRole("Admin") || User.IsInRole("Engineering"), ct));
    }

    [HttpGet("pending-review")]
    [Authorize(Roles = "Engineering,Admin")]
    public async Task<IActionResult> Pending(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        return Ok(await submissions.PendingAsync(ct));
    }

    [HttpPost("submissions")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(513L * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 513L * 1024 * 1024)]
    public async Task<IActionResult> Submit([FromForm] IFormFile file, [FromForm] string? description, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        if (file == null || file.Length == 0 || file.Length > 512L * 1024 * 1024)
            return BadRequest(new { message = "Chọn rosbag hợp lệ, tối đa 512 MB." });
        try
        {
            await using var stream = file.OpenReadStream();
            var result = await submissions.SubmitAsync(CurrentUserId, stream, file.FileName, description ?? "", ct);
            return StatusCode(201, result);
        }
        catch (ArgumentException e) { return BadRequest(new { message = e.Message }); }
        catch (InvalidDataException) { return BadRequest(new { message = "Không thể đọc tệp ZIP." }); }
    }

    public record ReviewRequest(bool Approve, string? Reason);

    [HttpPost("{id}/review")]
    [Authorize(Roles = "Engineering,Admin")]
    public async Task<IActionResult> Review(string id, ReviewRequest request, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
        try
        {
            return await submissions.ReviewAsync(id, CurrentUserId, request.Approve, request.Reason, ct)
                ? Ok(new { message = request.Approve ? "Đã chấp nhận rosbag." : "Đã từ chối rosbag." })
                : Conflict(new { message = "File không tồn tại hoặc đã được người khác duyệt. Hãy tải lại danh sách." });
        }
        catch (ArgumentException e) { return BadRequest(new { message = e.Message }); }
    }

}
