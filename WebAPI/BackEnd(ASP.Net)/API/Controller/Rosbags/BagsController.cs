using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Rosbags.Commands;
using Application.Features.Rosbags.DTOs;
using Application.Features.Rosbags.Queries;
using MediatR;
using Microsoft.AspNetCore.Http;
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

		/// <summary>
		/// Lấy danh sách các rosbag mẫu có sẵn trong thư mục Data
		/// </summary>
		[HttpGet("samples")]
		public async Task<IActionResult> GetSampleBags(CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetSampleBagsQuery(), cancellationToken);
			return Ok(result);
		}

		/// <summary>
		/// Nạp và phân tích rosbag (Topic, Tần số, Timeline, Tự phát hiện bất thường cơ bản)
		/// </summary>
		[HttpPost("inspect")]
		public async Task<IActionResult> InspectBag([FromBody] InspectRosbagRequestDto request, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new InspectRosbagCommand(request.BagPath, request.SampleName), cancellationToken);
			return Ok(result);
		}

		/// <summary>
		/// Upload trực tiếp file .db3 và nạp/phân tích ngay lập tức
		/// </summary>
		[HttpPost("upload-and-inspect")]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> UploadAndInspect([FromForm] IFormFile file, CancellationToken cancellationToken)
		{
			if (file == null || file.Length == 0)
			{
				return BadRequest(new { message = "Vui lòng chọn file rosbag (.db3) hợp lệ để tải lên." });
			}

			await using var stream = file.OpenReadStream();
			var result = await _mediator.Send(new UploadAndInspectBagCommand(stream, file.FileName), cancellationToken);
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
