using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Dashboard.Queries;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Dashboard
{
	[Route("api/dashboard")]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
	public class DashboardController : BaseController
	{
		private readonly IMediator _mediator;

		public DashboardController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet("stats")]
		public async Task<IActionResult> GetDashboardStats(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetDashboardStatsQuery(), cancellationToken);
			return Ok(result);
		}
	}
}
