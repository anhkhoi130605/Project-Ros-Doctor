using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.AboutUser;
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

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("UserActivityLogBackgroundService đang lắng nghe hàng đợi log...");

            try
            {
                await foreach (var request in _queue.ReadAllAsync(stoppingToken))
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                        string? userName = request.UserName;
                        string? email = request.Email;

                        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(email))
                        {
                            var user = await unitOfWork.User.GetByIdAsync(request.UserId, stoppingToken);
                            if (user != null)
                            {
                                userName = user.FullName;
                                email = user.Email;
                            }
                        }

                        var log = new UserActivityLog
                        {
                            UserId = request.UserId,
                            UserName = userName,
                            Email = email,
                            Action = request.ActionType.ToString(),
                            EntityType = request.TargetType.ToString(),
                            EntityId = request.TargetId,
                            RequestPath = request.RequestPath ?? request.Description,
                            HttpMethod = request.HttpMethod,
                            IpAddress = request.IpAddress,
                            UserAgent = request.UserAgent,
                            StatusSystemResponse = HttpStatusCode.OK,
                        };

                        await unitOfWork.UserActivityLogs.CreateAsync(log, stoppingToken);
                        await unitOfWork.SaveChangesAsync(stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Lỗi khi lưu UserActivityLog cho User {UserId}", request.UserId);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UserActivityLogBackgroundService gặp sự cố ngoài mong đợi.");
            }

            _logger.LogInformation("UserActivityLogBackgroundService đã hoàn tất tắt máy an toàn.");
        }
    }
}
