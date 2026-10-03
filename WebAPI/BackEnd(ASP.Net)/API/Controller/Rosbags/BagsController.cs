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
		/// Upload trực tiếp file .db3 và tùy chọn metadata.yaml (hoặc file .zip) và nạp/phân tích ngay lập tức
		/// </summary>
		[HttpPost("upload-and-inspect")]
		[Consumes("multipart/form-data")]
		[DisableRequestSizeLimit]
		[RequestFormLimits(MultipartBodyLengthLimit = 10L * 1024 * 1024 * 1024)]
		public async Task<IActionResult> UploadAndInspect(
			[FromForm] IFormFile? file,
			[FromForm] IFormFile? yamlFile,
			[FromForm] System.Collections.Generic.List<IFormFile>? files,
			CancellationToken cancellationToken)
		{
			IFormFile? db3 = file;
			IFormFile? yaml = yamlFile;

			if (files != null && files.Count > 0)
			{
				db3 ??= files.Find(f => f.FileName.EndsWith(".db3", System.StringComparison.OrdinalIgnoreCase)
				                        || f.FileName.EndsWith(".mcap", System.StringComparison.OrdinalIgnoreCase)
				                        || f.FileName.EndsWith(".zip", System.StringComparison.OrdinalIgnoreCase));
				yaml ??= files.Find(f => f.FileName.EndsWith(".yaml", System.StringComparison.OrdinalIgnoreCase)
				                         || f.FileName.EndsWith(".yml", System.StringComparison.OrdinalIgnoreCase));
			}

			if (db3 == null || db3.Length == 0)
			{
				return BadRequest(new { message = "Vui lòng chọn file rosbag (.db3 hoặc .zip) hợp lệ để tải lên." });
			}

			await using var db3Stream = db3.OpenReadStream();
			Stream? yamlStream = null;
			if (yaml != null && yaml.Length > 0)
			{
				yamlStream = yaml.OpenReadStream();
			}

			try
			{
				var result = await _mediator.Send(new UploadAndInspectBagCommand(db3Stream, db3.FileName, yamlStream, yaml?.FileName), cancellationToken);
				return Ok(result);
			}
			finally
			{
				if (yamlStream != null)
				{
					await yamlStream.DisposeAsync();
				}
			}
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
