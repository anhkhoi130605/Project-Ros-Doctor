using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Reviews.Commands;
using Application.Features.Reviews.DTOs;
using Application.Features.Reviews.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Reviews
{
	[Route("api/reviews")]
	public class ReviewsController : BaseController
	{
		private readonly IMediator _mediator;

		public ReviewsController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet]
		public async Task<IActionResult> GetReviews(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReviewsQuery(), cancellationToken);
			return Ok(result);
		}

		[HttpGet("{findingId}")]
		public async Task<IActionResult> GetReviewById(string findingId, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReviewByIdQuery(findingId), cancellationToken);
			if (result == null) return NotFound(new { message = $"Không tìm thấy phát hiện {findingId}" });
			return Ok(result);
		}

		[HttpPost("{findingId}/decision")]
		public async Task<IActionResult> SubmitDecision(string findingId, [FromBody] SubmitReviewRequestDto request, CancellationToken cancellationToken)
		{
			var reviewerId = CurrentUserId ?? "usr-reviewer";
			var result = await _mediator.Send(new SubmitReviewCommand(findingId, request, reviewerId), cancellationToken);
			return Ok(result);
		}
	}
}
