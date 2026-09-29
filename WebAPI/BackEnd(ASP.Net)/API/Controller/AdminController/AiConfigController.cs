using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Admin.AiConfig.Commands;
using Application.Features.Admin.AiConfig.DTOs;
using Application.Features.Admin.AiConfig.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.AdminController
{
	[Route("api/admin")]
	public class AiConfigController : BaseController
	{
		private readonly IMediator _mediator;

		public AiConfigController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet("ai-config")]
		public async Task<IActionResult> GetAiConfig(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetAiConfigQuery(), cancellationToken);
			return Ok(result);
		}

		[HttpPut("ai-config")]
		public async Task<IActionResult> UpdateAiConfig([FromBody] AiConfigDto config, CancellationToken cancellationToken)
		{
			var userId = CurrentUserId ?? "admin-system";
			var result = await _mediator.Send(new UpdateAiConfigCommand(config, userId), cancellationToken);
			return Ok(result);
		}

		[HttpGet("ai-usage")]
		public async Task<IActionResult> GetAiUsage(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetAiUsageQuery(), cancellationToken);
			return Ok(result);
		}
	}
}
