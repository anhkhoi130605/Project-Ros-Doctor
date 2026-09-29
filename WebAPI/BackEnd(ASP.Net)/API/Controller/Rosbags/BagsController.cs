using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Rosbags.Commands;
using Application.Features.Rosbags.DTOs;
using Application.Features.Rosbags.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Rosbags
{
	[Route("api/bags")]
	public class BagsController : BaseController
	{
		private readonly IMediator _mediator;

		public BagsController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet]
		public async Task<IActionResult> GetBags(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetBagsQuery(), cancellationToken);
			return Ok(result);
		}

		[HttpGet("{id}")]
		public async Task<IActionResult> GetBagById(string id, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetBagByIdQuery(id), cancellationToken);
			if (result == null) return NotFound(new { message = $"Không tìm thấy rosbag {id}" });
			return Ok(result);
		}

		[HttpPost]
		public async Task<IActionResult> CreateBag([FromBody] CreateRosbagRequestDto request, CancellationToken cancellationToken)
		{
			var userId = CurrentUserId ?? "usr-guest";
			var result = await _mediator.Send(new CreateRosbagCommand(request, userId), cancellationToken);
			return Created($"/api/bags/{result.Id}", result);
		}

		[HttpDelete("{id}")]
		public async Task<IActionResult> DeleteBag(string id, CancellationToken cancellationToken)
		{
			var success = await _mediator.Send(new DeleteRosbagCommand(id), cancellationToken);
			if (!success) return NotFound(new { message = $"Không tìm thấy rosbag {id}" });
			return NoContent();
		}
	}
}
