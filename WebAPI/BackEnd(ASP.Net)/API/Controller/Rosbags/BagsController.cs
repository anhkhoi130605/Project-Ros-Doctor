using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.Rosbags.Commands;
using Application.Features.Rosbags.DTOs;
using Application.Features.Rosbags.Queries;
using Application.Interfaces.Rosbag;
using Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.Rosbags
{
	[Route("api/bags")]
	public class BagsController : BaseController
	{
		private readonly IMediator _mediator;
		private readonly IRosbagJobQueue _jobQueue;

		public BagsController(IMediator mediator, IRosbagJobQueue jobQueue)
		{
			_mediator = mediator;
			_jobQueue = jobQueue;
		}

		[HttpGet]
		public async Task<IActionResult> GetBags([FromQuery] int? pageNumber, [FromQuery] int? pageSize, CancellationToken cancellationToken)
		{
			var result = await _mediator.Send(new GetBagsQuery(pageNumber, pageSize), cancellationToken);
			if (pageNumber.HasValue && pageSize.HasValue)
			{
				var pNum = Math.Max(1, pageNumber.Value);
				var pSize = Math.Clamp(pageSize.Value, 1, 100);
				// Count total bags efficiently
				var totalBags = result.Count; // Handler already projects page
				return Ok(new PaginationResult<RosbagDto>(result, totalBags, pNum, pSize));
			}
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
		/// Background Job Upload: Lưu file tạm an toàn và đưa vào hàng đợi phân tích nền
		/// </summary>
		[HttpPost("upload")]
		[Consumes("multipart/form-data")]
		[RequestFormLimits(MultipartBodyLengthLimit = 2L * 1024 * 1024 * 1024)] // Giới hạn 2 GB thay vì 10 GB
		public async Task<IActionResult> UploadBagBackground(
			[FromForm] IFormFile? file,
			[FromForm] IFormFile? yamlFile,
			CancellationToken cancellationToken)
		{
			if (file == null || file.Length == 0)
			{
				return BadRequest(new { message = "Vui lòng chọn tệp Rosbag (.db3, .mcap hoặc .zip) hợp lệ để tải lên." });
			}

			var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
			if (ext is not (".db3" or ".mcap" or ".zip"))
			{
				return BadRequest(new { message = "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận .db3, .mcap hoặc .zip." });
			}

			// Lưu file tạm vào thư mục an toàn
			var tempDir = Path.Combine(Path.GetTempPath(), "rosbag_jobs");
			Directory.CreateDirectory(tempDir);

			var job = new RosbagAnalysisJob
			{
				FileName = file.FileName,
				Status = RosbagJobStatus.Pending,
				ProgressPercent = 5,
				Stage = "Đã nhận tệp và đưa vào hàng đợi xử lý nền"
			};

			var tempFilePath = Path.Combine(tempDir, $"{job.JobId}_{file.FileName}");
			await using (var fs = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
			{
				await file.CopyToAsync(fs, cancellationToken);
			}
			job.TempFilePath = tempFilePath;

			if (yamlFile != null && yamlFile.Length > 0)
			{
				var yamlTemp = Path.Combine(tempDir, $"{job.JobId}_{yamlFile.FileName}");
				await using (var yfs = new FileStream(yamlTemp, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
				{
					await yamlFile.CopyToAsync(yfs, cancellationToken);
				}
				job.YamlTempFilePath = yamlTemp;
			}

			await _jobQueue.EnqueueAsync(job, cancellationToken);

			return Accepted(new
			{
				jobId = job.JobId,
				status = "pending",
				message = "Tệp đã được đưa vào hàng đợi phân tích nền thành công.",
				pollUrl = $"/api/bags/jobs/{job.JobId}"
			});
		}

		/// <summary>
		/// Kiểm tra trạng thái và tiến độ xử lý của Job phân tích Rosbag
		/// </summary>
		[HttpGet("jobs/{jobId}")]
		public IActionResult GetJobStatus(string jobId)
		{
			var job = _jobQueue.GetJob(jobId);
			if (job == null)
			{
				return NotFound(new { message = $"Không tìm thấy tiến trình phân tích {jobId}." });
			}

			return Ok(new
			{
				jobId = job.JobId,
				fileName = job.FileName,
				status = job.Status.ToString().ToLowerInvariant(),
				progress = job.ProgressPercent,
				stage = job.Stage,
				createdAt = job.CreatedAt.ToString("o"),
				completedAt = job.CompletedAt?.ToString("o"),
				error = job.ErrorMessage,
				result = job.Result
			});
		}

		/// <summary>
		/// Nạp và phân tích rosbag trực tiếp theo đường dẫn tệp
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
		[RequestFormLimits(MultipartBodyLengthLimit = 2L * 1024 * 1024 * 1024)]
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
				db3 ??= files.Find(f => f.FileName.EndsWith(".db3", StringComparison.OrdinalIgnoreCase)
				                        || f.FileName.EndsWith(".mcap", StringComparison.OrdinalIgnoreCase)
				                        || f.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase));
				yaml ??= files.Find(f => f.FileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase)
				                         || f.FileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase));
			}

			if (db3 == null || db3.Length == 0)
			{
				return BadRequest(new { message = "Vui lòng chọn file rosbag (.db3 hoặc .zip) hợp lệ để tải lên." });
			}

			var ext = Path.GetExtension(db3.FileName).ToLowerInvariant();
			if (ext is not (".db3" or ".mcap" or ".zip"))
			{
				return BadRequest(new { message = "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận .db3, .mcap hoặc .zip." });
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
