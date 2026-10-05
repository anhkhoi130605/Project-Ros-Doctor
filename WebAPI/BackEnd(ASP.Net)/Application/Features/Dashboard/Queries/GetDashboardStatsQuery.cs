using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Dashboard.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTransaction;
using Domain.Enums;

namespace Application.Features.Dashboard.Queries
{
	public record GetDashboardStatsQuery() : IRequest<DashboardStatsDto>;

	public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, DashboardStatsDto>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IRedisService _redisService;
		private static readonly System.Threading.SemaphoreSlim _cacheLock = new(1, 1);

		public GetDashboardStatsQueryHandler(IUnitOfWork unitOfWork, IRedisService redisService)
		{
			_unitOfWork = unitOfWork;
			_redisService = redisService;
		}

		public async Task<DashboardStatsDto> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
		{
			// Check Redis cache first
			var cached = await _redisService.GetCacheAsync<DashboardStatsDto>("dashboard:overview");
			if (cached != null)
			{
				return cached;
			}

			// Prevent Cache Stampede: only one request executes queries on cache miss
			await _cacheLock.WaitAsync(cancellationToken);
			try
			{
				// Double-check cache inside lock
				cached = await _redisService.GetCacheAsync<DashboardStatsDto>("dashboard:overview");
				if (cached != null)
				{
					return cached;
				}

				// Execute direct SQL aggregations instead of loading full tables into RAM
				var totalBags = await _unitOfWork.Rosbags.CountAsync(null, cancellationToken);
				var completeBags = await _unitOfWork.Rosbags.CountAsync(b => b.Status == RosbagStatus.Complete, cancellationToken);
				var processingBags = await _unitOfWork.Rosbags.CountAsync(b => b.Status == RosbagStatus.Processing, cancellationToken);
				var pendingBags = await _unitOfWork.Rosbags.CountAsync(b => b.Status == RosbagStatus.Ready, cancellationToken);

				var totalSessions = await _unitOfWork.AnalysisSessions.CountAsync(null, cancellationToken);
				var healthAvg = (int)await _unitOfWork.AnalysisSessions.AverageDoubleAsync(s => s.HealthScore, null, 95, cancellationToken);

				var totalIssues = await _unitOfWork.DiagnosticIssues.CountAsync(null, cancellationToken);
				var highSeverityIssues = await _unitOfWork.DiagnosticIssues.CountAsync(i => i.Severity == IssueSeverity.HIGH, cancellationToken);

				var totalReports = await _unitOfWork.Reports.CountAsync(null, cancellationToken);

				var totalTokens = await _unitOfWork.AiUsageLogs.SumLongAsync(l => (long)l.PromptTokens + (long)l.CompletionTokens, null, cancellationToken);
				var totalCost = await _unitOfWork.AiUsageLogs.SumDecimalAsync(l => l.CostUsd, null, cancellationToken);

				var stats = new DashboardStatsDto
				{
					TotalBags = totalBags,
					CompleteBags = completeBags,
					ProcessingBags = processingBags,
					PendingBags = pendingBags,
					TotalSessions = totalSessions,
					TotalIssues = totalIssues,
					HighSeverityIssues = highSeverityIssues,
					TotalReports = totalReports,
					TotalTokensUsed = totalTokens,
					TotalCostUsd = totalCost,
					HealthScoreAvg = healthAvg
				};

				// Cache in Redis for 60 seconds
				await _redisService.SetCacheAsync("dashboard:overview", stats, System.TimeSpan.FromSeconds(60));

				return stats;
			}
			finally
			{
				_cacheLock.Release();
			}
		}
	}
}
