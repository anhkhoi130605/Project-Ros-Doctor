using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Sessions.Commands;
using Application.Features.Sessions.DTOs;
using Application.Features.Sessions.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Sessions
{
	[Route("api/sessions")]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
	public class SessionsController : BaseController
	{
		private readonly IMediator _mediator;

		public SessionsController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet]
		public async Task<IActionResult> GetSessions([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
		{
			var canViewAll = User.IsInRole("Admin") || User.IsInRole("Engineering");
			var result = await _mediator.Send(new GetAllSessionsQuery(CurrentUserId, canViewAll, page, pageSize), cancellationToken);
			return Ok(result);
		}

		[HttpGet("{id}")]
		public async Task<IActionResult> GetSessionById(string id, CancellationToken cancellationToken)
		{
			var canViewAll = User.IsInRole("Admin") || User.IsInRole("Engineering");
			var result = await _mediator.Send(new GetSessionByIdQuery(id, CurrentUserId, canViewAll), cancellationToken);
			if (result == null) return NotFound(new { message = $"Không tìm thấy phiên phân tích {id}" });
			return Ok(result);
		}

		[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin,Engineering")]
		[HttpPost("start")]
		public async Task<IActionResult> StartAnalysis([FromBody] StartAnalysisRequestDto request, CancellationToken cancellationToken)
		{
			var userId = CurrentUserId ?? "usr-guest";
			try
			{
				var result = await _mediator.Send(new StartAnalysisCommand(request, userId), cancellationToken);
				return Ok(result);
			}
			catch (System.InvalidOperationException e) { return Conflict(new { message = e.Message }); }
			catch (System.Collections.Generic.KeyNotFoundException e) { return NotFound(new { message = e.Message }); }
		}
	}
}
