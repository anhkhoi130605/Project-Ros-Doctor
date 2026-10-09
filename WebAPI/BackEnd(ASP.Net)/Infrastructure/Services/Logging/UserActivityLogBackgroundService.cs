using System.Net;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Logging
{
    /// <summary>
    /// Background Service tiêu thụ hàng đợi UserActivityLog một cách có kiểm soát luồng.
    /// Giúp bảo vệ MySQL Connection Pool, không bị nghẽn ThreadPool và hỗ trợ graceful shutdown.
    /// </summary>
    public class UserActivityLogBackgroundService : BackgroundService
    {
        private readonly IUserActivityLogQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<UserActivityLogBackgroundService> _logger;

        public UserActivityLogBackgroundService(
            IUserActivityLogQueue queue,
            IServiceScopeFactory scopeFactory,
            ILogger<UserActivityLogBackgroundService> logger)
        {
            _queue = queue;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Name, string Email, DateTime Expiry)> _userCache = new();

		protected override async Task ExecuteAsync(CancellationToken stoppingToken)
		{
			_logger.LogInformation(
				"UserActivityLogBackgroundService đang chạy.");

			var buffer = new List<LogActivityRequest>(50);

			try
			{
				while (!stoppingToken.IsCancellationRequested)
				{
					using var timeoutCts =
						new CancellationTokenSource(
							TimeSpan.FromMilliseconds(500));

					using var linkedCts =
						CancellationTokenSource.CreateLinkedTokenSource(
							stoppingToken,
							timeoutCts.Token);

					try
					{
						await foreach (
							var request in _queue.ReadAllAsync(linkedCts.Token))
						{
							buffer.Add(request);

							if (buffer.Count >= 50)
								break;
						}
					}
					catch (OperationCanceledException)
						when (timeoutCts.IsCancellationRequested
							  && !stoppingToken.IsCancellationRequested)
					{
						// Timeout 500ms: flush batch hiện tại.
					}

					if (buffer.Count == 0)
						continue;

					var retryDelay = TimeSpan.FromSeconds(1);

					while (buffer.Count > 0
						   && !stoppingToken.IsCancellationRequested)
					{
						try
						{
							await FlushBatchAsync(buffer, stoppingToken);

							// Chỉ xóa khi ghi DB thành công.
							buffer.Clear();
							break;
						}
						catch (OperationCanceledException)
							when (stoppingToken.IsCancellationRequested)
						{
							throw;
						}
						catch (Exception ex)
						{
							_logger.LogError(
								ex,
								"Ghi thất bại {Count} activity logs. Sẽ thử lại sau {Delay}s.",
								buffer.Count,
								retryDelay.TotalSeconds);

							await Task.Delay(retryDelay, stoppingToken);

							retryDelay = TimeSpan.FromSeconds(
								Math.Min(retryDelay.TotalSeconds * 2, 30));
						}
					}
				}
			}
			catch (OperationCanceledException)
				when (stoppingToken.IsCancellationRequested)
			{
				_logger.LogInformation(
					"UserActivityLogBackgroundService đang dừng.");
			}

			if (buffer.Count > 0)
			{
				try
				{
					await FlushBatchAsync(buffer, CancellationToken.None);
					buffer.Clear();
				}
				catch (Exception ex)
				{
					_logger.LogCritical(
						ex,
						"Không thể ghi {Count} activity logs khi shutdown.",
						buffer.Count);
				}
			}
		}

		private async Task FlushBatchAsync(List<LogActivityRequest> batch, CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                // Gom danh sách userId cần truy vấn thông tin
                var missingUserIds = batch
                    .Where(r => string.IsNullOrWhiteSpace(r.UserName) || string.IsNullOrWhiteSpace(r.Email))
                    .Select(r => r.UserId)
                    .Distinct()
                    .Where(uid => !_userCache.TryGetValue(uid, out var cached) || cached.Expiry < DateTime.UtcNow)
                    .ToList();

                if (missingUserIds.Count > 0)
                {
                    var users = await unitOfWork.User.GetAllAsync(u => missingUserIds.Contains(u.Id), null, cancellationToken);
                    foreach (var u in users)
                    {
                        _userCache[u.Id] = (u.FullName, u.Email, DateTime.UtcNow.AddMinutes(10));
                    }
                }

                var entities = new List<UserActivityLog>(batch.Count);
                foreach (var req in batch)
                {
                    string? userName = req.UserName;
                    string? email = req.Email;

                    if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(email))
                    {
                        if (_userCache.TryGetValue(req.UserId, out var cached))
                        {
                            userName = cached.Name;
                            email = cached.Email;
                        }
                    }

                    entities.Add(new UserActivityLog
                    {
                        UserId = req.UserId,
                        UserName = userName,
                        Email = email,
                        Action = req.ActionType.ToString(),
                        EntityType = req.TargetType.ToString(),
                        EntityId = req.TargetId,
                        RequestPath = req.RequestPath ?? req.Description,
                        HttpMethod = req.HttpMethod,
                        IpAddress = req.IpAddress,
                        UserAgent = req.UserAgent,
                        StatusSystemResponse = HttpStatusCode.OK,
                    });
                }

                foreach (var entity in entities)
                {
                    await unitOfWork.UserActivityLogs.CreateAsync(entity, cancellationToken);
                }

                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi ghi batch {Count} UserActivityLogs vào Database.", batch.Count);
				throw;
			}
        }
    }
}
