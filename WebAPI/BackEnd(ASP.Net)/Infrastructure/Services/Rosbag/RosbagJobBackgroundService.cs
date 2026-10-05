using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.Commands;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Rosbag
{
	public class RosbagJobBackgroundService : BackgroundService
	{
		private readonly IRosbagJobQueue _jobQueue;
		private readonly IServiceScopeFactory _scopeFactory;
		private readonly ILogger<RosbagJobBackgroundService> _logger;
		private static readonly SemaphoreSlim _concurrencyLimiter = new(2, 2);

		public RosbagJobBackgroundService(
			IRosbagJobQueue jobQueue,
			IServiceScopeFactory scopeFactory,
			ILogger<RosbagJobBackgroundService> logger)
		{
			_jobQueue = jobQueue;
			_scopeFactory = scopeFactory;
			_logger = logger;
		}

		protected override async Task ExecuteAsync(CancellationToken stoppingToken)
		{
			_logger.LogInformation("RosbagJobBackgroundService bắt đầu lắng nghe hàng đợi phân tích Rosbag...");

			while (!stoppingToken.IsCancellationRequested)
			{
				try
				{
					if (await _jobQueue.Reader.WaitToReadAsync(stoppingToken))
					{
						while (_jobQueue.Reader.TryRead(out var job))
						{
							// Process jobs with concurrency limit
							_ = ProcessJobWithThrottlingAsync(job, stoppingToken);
						}
					}
				}
				catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
				{
					break;
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, "Lỗi xảy ra trong vòng lặp RosbagJobBackgroundService.");
				}
			}

			_logger.LogInformation("RosbagJobBackgroundService đã kết thúc an toàn.");
		}

		private async Task ProcessJobWithThrottlingAsync(RosbagAnalysisJob job, CancellationToken stoppingToken)
		{
			await _concurrencyLimiter.WaitAsync(stoppingToken);

			try
			{
				job.Status = RosbagJobStatus.Processing;
				job.ProgressPercent = 20;
				job.Stage = "Đang đọc và phân tích tệp Rosbag nhị phân";
				_jobQueue.UpdateJob(job);

				// 5-minute timeout per job
				using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
				using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, timeoutCts.Token);

				using var scope = _scopeFactory.CreateScope();
				var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

				if (!File.Exists(job.TempFilePath))
				{
					throw new FileNotFoundException($"Không tìm thấy tệp tạm {job.TempFilePath}");
				}

				await using var fileStream = File.OpenRead(job.TempFilePath);
				Stream? yamlStream = null;
				if (!string.IsNullOrEmpty(job.YamlTempFilePath) && File.Exists(job.YamlTempFilePath))
				{
					yamlStream = File.OpenRead(job.YamlTempFilePath);
				}

				try
				{
					job.ProgressPercent = 50;
					job.Stage = "Đang kiểm tra topic, chuỗi TF và tần số";
					_jobQueue.UpdateJob(job);

					var result = await mediator.Send(
						new UploadAndInspectBagCommand(
							fileStream,
							job.FileName,
							yamlStream,
							yamlStream != null ? Path.GetFileName(job.YamlTempFilePath) : null),
						linkedCts.Token);

					job.Status = RosbagJobStatus.Completed;
					job.ProgressPercent = 100;
					job.Stage = "Hoàn tất chẩn đoán và phân tích";
					job.CompletedAt = DateTime.UtcNow;
					job.Result = result;
					_jobQueue.UpdateJob(job);
				}
				finally
				{
					if (yamlStream != null)
					{
						await yamlStream.DisposeAsync();
					}
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Thất bại khi thực hiện phân tích nền Rosbag Job {JobId} ({FileName})", job.JobId, job.FileName);
				job.Status = RosbagJobStatus.Failed;
				job.ErrorMessage = ex.Message;
				job.CompletedAt = DateTime.UtcNow;
				job.Stage = "Gặp sự cố khi phân tích tệp";
				_jobQueue.UpdateJob(job);
			}
			finally
			{
				// Clean up temporary files safely in finally block
				try
				{
					if (!string.IsNullOrEmpty(job.TempFilePath) && File.Exists(job.TempFilePath))
					{
						File.Delete(job.TempFilePath);
					}
					if (!string.IsNullOrEmpty(job.YamlTempFilePath) && File.Exists(job.YamlTempFilePath))
					{
						File.Delete(job.YamlTempFilePath);
					}
				}
				catch (Exception cleanEx)
				{
					_logger.LogWarning(cleanEx, "Không thể xóa file tạm cho Job {JobId}", job.JobId);
				}

				_concurrencyLimiter.Release();
			}
		}
	}
}
