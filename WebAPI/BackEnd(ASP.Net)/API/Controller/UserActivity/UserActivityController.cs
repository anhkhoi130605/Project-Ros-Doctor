using Application.Features.UserActivity.Queries;
using Application.Interfaces.Logging;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controller.UserActivity
{
    [ApiController]
    [Route("api/user-activity")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public class UserActivityController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IUserActivityLogService _activityLogService;

        public UserActivityController(IMediator mediator, IUserActivityLogService activityLogService)
        {
            _mediator = mediator;
            _activityLogService = activityLogService;
        }

        [HttpGet("paged")]
        [EnableRateLimiting("activity-search")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> GetPaged([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 30, [FromQuery] string? logSearch = null, [FromQuery] string? userSearch = null, [FromQuery] string? actionMatches = null)
        {
            if (pageNumber is < 1 or > 10000 || pageSize is < 1 or > 100 ||
                logSearch?.Length > 100 || userSearch?.Length > 100 || actionMatches?.Length > 1000)
                return BadRequest("Invalid activity log search or pagination parameters.");

            return Ok(await _mediator.Send(new GetUserActivityPageQuery(pageNumber, pageSize, logSearch, userSearch, actionMatches)));
        }

        [HttpGet]
        [EnableRateLimiting("activity-search")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> Get([FromQuery] string? userId = null, [FromQuery] string? action = null, [FromQuery] int take = 50)
        {
            if (take <= 0) take = 20;
            if (take > 100) take = 100;

            var result = await _mediator.Send(new GetUserActivityQuery(userId, action, take));
            return Ok(result);
        }

        [HttpGet("{id}")]
        [EnableRateLimiting("activity-search")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> GetById(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("Log id is required.");
            }

            var result = await _mediator.Send(new GetUserActivityByIdQuery(id));
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        [HttpPost("log")]
        [AllowAnonymous]
        public async Task<IActionResult> LogActivity([FromBody] LogActivityDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Action))
                return BadRequest("Action is required.");

            var userId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User?.FindFirst("sub")?.Value
                         ?? dto.UserId
                         ?? "91f0c64e-b1ff-11f1-a905-32edb70d93e0"; // default admin

            var userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                           ?? dto.UserName;
            var email = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                        ?? dto.Email;

            var actionType = Enum.TryParse<UserActionType>(dto.Action, true, out var parsedAction)
                ? parsedAction
                : UserActionType.Other;

            var targetType = Enum.TryParse<TargetType>(dto.TargetType, true, out var parsedTarget)
                ? parsedTarget
                : TargetType.None;

            await _activityLogService.LogActivityAsync(new LogActivityRequest(
                UserId: userId,
                ActionType: actionType,
                TargetId: dto.TargetId,
                TargetType: targetType,
                Description: dto.Description ?? dto.Action,
                RequestPath: dto.RequestPath ?? HttpContext.Request.Path,
                HttpMethod: dto.HttpMethod ?? "POST",
                IpAddress: HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                UserAgent: Request.Headers["User-Agent"].ToString(),
                UserName: userName,
                Email: email
            ));

            return Ok(new { success = true, message = "Activity logged successfully." });
        }
    }

    public class LogActivityDto
    {
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? Email { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? TargetType { get; set; }
        public string? TargetId { get; set; }
        public string? Description { get; set; }
        public string? RequestPath { get; set; }
        public string? HttpMethod { get; set; }
    }
}
