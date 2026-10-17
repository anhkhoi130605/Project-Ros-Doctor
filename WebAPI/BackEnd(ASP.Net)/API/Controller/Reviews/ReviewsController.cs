using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Reviews.Commands;
using Application.Features.Reviews.DTOs;
using Application.Features.Reviews.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Domain.Enums;

namespace API.Controller.Reviews
{
	[Route("api/reviews")]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin,Engineering")]
	public class ReviewsController : BaseController
	{
		private readonly IMediator _mediator;

		public ReviewsController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet]
		public async Task<IActionResult> GetReviews([FromQuery] int? pageNumber, [FromQuery] int? pageSize, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReviewsQuery(), cancellationToken);
			if (pageNumber.HasValue && pageSize.HasValue && pageSize.Value > 0)
			{
				var pNum = System.Math.Max(1, pageNumber.Value);
				var pSize = pageSize.Value;
				var total = result.Count;
				var paged = System.Linq.Enumerable.ToList(System.Linq.Enumerable.Take(System.Linq.Enumerable.Skip(result, (pNum - 1) * pSize), pSize));
				return Ok(new Domain.Common.PaginationResult<ReviewItemDto>(paged, total, pNum, pSize));
			}
			return Ok(result);
		}

		[HttpGet("{findingId}")]
		public async Task<IActionResult> GetReviewById(string findingId, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetReviewByIdQuery(findingId), cancellationToken);
			if (result == null) return NotFound(new { message = $"Không tìm thấy phát hiện {findingId}" });
			return Ok(result);
		}

		[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin,Engineering")]
		[HttpPost("{findingId}/decision")]
		public async Task<IActionResult> SubmitDecision(string findingId, [FromBody] SubmitReviewRequestDto request, CancellationToken cancellationToken)
		{
			var reviewerId = CurrentUserId ?? "usr-reviewer";
			var result = await _mediator.Send(new SubmitReviewCommand(findingId, request, reviewerId), cancellationToken);
			var action = result.Status switch
			{
				"approved" => UserActionType.ApproveFinding,
				"rejected" => UserActionType.RejectFinding,
				"changesneeded" => UserActionType.RequestReviewChanges,
				_ => UserActionType.SubmitReview
			};
			await LogUserActivity(action, findingId, TargetType.Finding, $"Review decision: {result.Status}");
			return Ok(result);
		}
	}
}
