using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Dashboard.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTrancsaction;
using Domain.Enums;

namespace Application.Features.Dashboard.Queries
{
	public record GetDashboardStatsQuery() : IRequest<DashboardStatsDto>;

	public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, DashboardStatsDto>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IRedisService _redisService;

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

			var bags = (await _unitOfWork.Rosbags.GetAllAsync(null, null, cancellationToken)).ToList();
			var sessions = (await _unitOfWork.AnalysisSessions.GetAllAsync(null, null, cancellationToken)).ToList();
			var issues = (await _unitOfWork.DiagnosticIssues.GetAllAsync(null, null, cancellationToken)).ToList();
			var reports = (await _unitOfWork.Reports.GetAllAsync(null, null, cancellationToken)).ToList();
			var aiLogs = (await _unitOfWork.AiUsageLogs.GetAllAsync(null, null, cancellationToken)).ToList();

			var stats = new DashboardStatsDto
			{
				TotalBags = bags.Count,
				CompleteBags = bags.Count(b => b.Status == RosbagStatus.Complete),
				ProcessingBags = bags.Count(b => b.Status == RosbagStatus.Processing),
				PendingBags = bags.Count(b => b.Status == RosbagStatus.Ready),
				TotalSessions = sessions.Count,
				TotalIssues = issues.Count,
				HighSeverityIssues = issues.Count(i => i.Severity == IssueSeverity.HIGH),
				TotalReports = reports.Count,
				TotalTokensUsed = aiLogs.Sum(l => l.PromptTokens + l.CompletionTokens),
				TotalCostUsd = aiLogs.Sum(l => l.CostUsd),
				HealthScoreAvg = sessions.Any() ? (int)sessions.Average(s => s.HealthScore) : 95
			};

			// Cache in Redis for 60 seconds
			await _redisService.SetCacheAsync("dashboard:overview", stats, System.TimeSpan.FromSeconds(60));

			return stats;
		}
	}
}
