using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Sessions.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTrancsaction;
using MongoDB.Driver;
using Domain.Entities.NoSql;

namespace Application.Features.Sessions.Queries
{
	public record GetSessionByIdQuery(string Id) : IRequest<SessionDetailDto?>;

	public class GetSessionByIdQueryHandler : IRequestHandler<GetSessionByIdQuery, SessionDetailDto?>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMongoDbContext _mongoDbContext;
		private readonly IRedisService _redisService;

		public GetSessionByIdQueryHandler(IUnitOfWork unitOfWork, IMongoDbContext mongoDbContext, IRedisService redisService)
		{
			_unitOfWork = unitOfWork;
			_mongoDbContext = mongoDbContext;
			_redisService = redisService;
		}

		public async Task<SessionDetailDto?> Handle(GetSessionByIdQuery request, CancellationToken cancellationToken)
		{
			var session = await _unitOfWork.AnalysisSessions.GetByIdAsync(request.Id, cancellationToken);
			if (session == null) return null;

			var bag = await _unitOfWork.Rosbags.GetByIdAsync(session.RosbagId, cancellationToken);
			var allIssues = await _unitOfWork.DiagnosticIssues.GetAllAsync(null, null, cancellationToken);
			var sessionIssues = allIssues.Where(i => i.SessionId == session.Id).ToList();

			var allAudits = await _unitOfWork.ReviewAuditLogs.GetAllAsync(null, null, cancellationToken);
			var auditMap = allAudits
				.GroupBy(a => a.FindingId)
				.ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.ReviewedAt).First());

			// Try to retrieve MongoDB TF tree if present
			object? tfTreeData = null;
			try
			{
				var tfDoc = await _mongoDbContext.SessionTfTrees
					.Find(t => t.SessionId == session.Id)
					.FirstOrDefaultAsync(cancellationToken);
				if (tfDoc != null)
				{
					tfTreeData = tfDoc.Frames;
				}
			}
			catch
			{
				// Fallback gracefully if Mongo is unreachable
			}

			// Try to get evidence from MongoDB
			var evidenceMap = new Dictionary<string, FindingEvidenceDocument>();
			try
			{
				var evidences = await _mongoDbContext.FindingsEvidence
					.Find(e => e.SessionId == session.Id)
					.ToListAsync(cancellationToken);
				foreach (var ev in evidences)
				{
					evidenceMap[ev.FindingId] = ev;
				}
			}
			catch
			{
				// Fallback
			}

			var issueDtos = sessionIssues.Select(i =>
			{
				auditMap.TryGetValue(i.Id, out var audit);
				evidenceMap.TryGetValue(i.Id, out var ev);

				return new DiagnosticIssueDto
				{
					Id = i.Id,
					SessionId = i.SessionId,
					Title = i.IssueTitle,
					Topic = i.Topic,
					Severity = i.Severity.ToString().ToLower(),
					Observation = ev != null ? $"Quan sát: {ev.Kind} trên {i.Topic}." : $"Phát hiện bất thường trên {i.Topic} trong khoảng {i.TimeRange}.",
					Hypothesis = "Nguồn phát có thể bị gián đoạn. Cần kỹ sư đối chiếu và xác nhận.",
					Steps = ev?.Steps ?? new List<string> { "Đối chiếu log /rosout", "Kiểm tra QoS và tải hệ thống" },
					Review = audit != null ? new ReviewInfoDto
					{
						Status = audit.Decision.ToString().ToLower(),
						Note = audit.ReviewNote,
						By = audit.ReviewerId,
						At = audit.ReviewedAt.ToString("o")
					} : new ReviewInfoDto
					{
						Status = "pending"
					}
				};
			}).ToList();

			return new SessionDetailDto
			{
				Id = session.Id,
				BagId = session.RosbagId,
				Name = bag?.FileName ?? "ROS2 Bag",
				Duration = bag?.DurationSec ?? 0,
				Topics = bag?.TopicCount ?? 0,
				Messages = 387000,
				Status = session.Status.ToString().ToLower(),
				HealthScore = session.HealthScore,
				ProcessingSeconds = session.ExecutionTimeSec,
				CreatedAt = session.StartedAt.ToString("o"),
				Issues = issueDtos,
				TfTree = tfTreeData
			};
		}
	}
}
