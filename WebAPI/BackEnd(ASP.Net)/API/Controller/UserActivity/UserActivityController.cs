using Application.Features.UserActivity.Queries;
using Application.Interfaces.Logging;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.UserActivity
{
    [ApiController]
    [Route("api/user-activity")]
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
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> GetPaged([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 30, [FromQuery] string? logSearch = null, [FromQuery] string? userSearch = null, [FromQuery] string? actionMatches = null)
        {
            return Ok(await _mediator.Send(new GetUserActivityPageQuery(pageNumber, pageSize, logSearch, userSearch, actionMatches)));
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Get([FromQuery] string? userId = null, [FromQuery] string? action = null, [FromQuery] int take = 50)
        {
            if (take <= 0) take = 20;
            if (take > 100) take = 100;

            var result = await _mediator.Send(new GetUserActivityQuery(userId, action, take));
            return Ok(result);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
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
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> LogActivity([FromBody] LogActivityDto dto)
        {
            if (dto == null || !Enum.TryParse<UserActionType>(dto.Action, true, out var action) ||
                action is not (UserActionType.ChatAgent or UserActionType.UpdateLocalSettings))
                return BadRequest("Unsupported client activity.");

            var userId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User?.FindFirst("sub")?.Value;
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var email = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            await _activityLogService.LogActivityAsync(new LogActivityRequest(
                UserId: userId,
                ActionType: action,
                TargetId: dto.TargetId,
                TargetType: action == UserActionType.ChatAgent ? TargetType.ChatMessage : TargetType.SystemSettings,
                Description: action == UserActionType.ChatAgent ? "Chat Agent request" : "Local settings saved",
                RequestPath: action == UserActionType.ChatAgent ? "/ai-agent/api/v1/chat/stream" : "/settings",
                HttpMethod: "POST",
                IpAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
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
