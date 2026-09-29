using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Reports.Commands;
using Application.Features.Reports.DTOs;
using Application.Features.Reports.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Reports
{
	[Route("api/reports")]
	public class ReportsController : BaseController
	{
		private readonly IMediator _mediator;

		public ReportsController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet]
		public async Task<IActionResult> GetReports(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReportsQuery(), cancellationToken);
			return Ok(result);
		}

		[HttpGet("{id}")]
		public async Task<IActionResult> GetReportById(string id, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReportByIdQuery(id), cancellationToken);
			if (result == null) return NotFound(new { message = $"Không tìm thấy báo cáo {id}" });
			return Ok(result);
		}

		[HttpPost]
		public async Task<IActionResult> CreateReport([FromBody] CreateReportRequestDto request, CancellationToken cancellationToken)
		{
			var reviewerId = CurrentUserId ?? "usr-reviewer";
			var result = await _mediator.Send(new CreateReportCommand(request, reviewerId), cancellationToken);
			return Created($"/api/reports/{result.Id}", result);
		}
	}
}
