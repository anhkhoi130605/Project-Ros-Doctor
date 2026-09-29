using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Reviews.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Application.Features.Reviews.Queries
{
	public record GetReviewsQuery() : IRequest<List<ReviewItemDto>>;

	public class GetReviewsQueryHandler : IRequestHandler<GetReviewsQuery, List<ReviewItemDto>>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMongoDbContext _mongoDbContext;

		public GetReviewsQueryHandler(IUnitOfWork unitOfWork, IMongoDbContext mongoDbContext)
		{
			_unitOfWork = unitOfWork;
			_mongoDbContext = mongoDbContext;
		}

		public async Task<List<ReviewItemDto>> Handle(GetReviewsQuery request, CancellationToken cancellationToken)
		{
			var issues = await _unitOfWork.DiagnosticIssues.GetAllAsync(null, null, cancellationToken);
			var audits = await _unitOfWork.ReviewAuditLogs.GetAllAsync(null, null, cancellationToken);

			var auditMap = audits
				.GroupBy(a => a.FindingId)
				.ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.ReviewedAt).First());

			var evidenceMap = new Dictionary<string, FindingEvidenceDocument>();
			try
			{
				var evidences = await _mongoDbContext.FindingsEvidence.Find(_ => true).ToListAsync(cancellationToken);
				foreach (var ev in evidences)
				{
					evidenceMap[ev.FindingId] = ev;
				}
			}
			catch
			{
				// Mongo fallback
			}

			return issues.Select(i =>
			{
				auditMap.TryGetValue(i.Id, out var audit);
				evidenceMap.TryGetValue(i.Id, out var ev);

				return new ReviewItemDto
				{
					Id = i.Id,
					SessionId = i.SessionId,
					Title = i.IssueTitle,
					Topic = i.Topic,
					Severity = i.Severity.ToString().ToLower(),
					Interval = i.TimeRange,
					Observation = ev != null ? $"Quan sát: {ev.Kind} trên {i.Topic}." : $"Bất thường trên topic {i.Topic}.",
					Hypothesis = "Nguồn phát có thể bị gián đoạn. Cần kỹ sư đối chiếu và xác nhận.",
					Steps = ev?.Steps ?? new List<string> { "Đối chiếu log /rosout" },
					Status = audit != null ? audit.Decision.ToString().ToLower() : "pending",
					Note = audit?.ReviewNote,
					ReviewedBy = audit?.ReviewerId,
					ReviewedAt = audit?.ReviewedAt.ToString("o")
				};
			}).ToList();
		}
	}

	public record GetReviewByIdQuery(string FindingId) : IRequest<ReviewItemDto?>;

	public class GetReviewByIdQueryHandler : IRequestHandler<GetReviewByIdQuery, ReviewItemDto?>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMongoDbContext _mongoDbContext;

		public GetReviewByIdQueryHandler(IUnitOfWork unitOfWork, IMongoDbContext mongoDbContext)
		{
			_unitOfWork = unitOfWork;
			_mongoDbContext = mongoDbContext;
		}

		public async Task<ReviewItemDto?> Handle(GetReviewByIdQuery request, CancellationToken cancellationToken)
		{
			var issue = await _unitOfWork.DiagnosticIssues.GetByIdAsync(request.FindingId, cancellationToken);
			if (issue == null) return null;

			var audits = await _unitOfWork.ReviewAuditLogs.GetAllAsync(null, null, cancellationToken);
			var audit = audits
				.Where(a => a.FindingId == issue.Id)
				.OrderByDescending(a => a.ReviewedAt)
				.FirstOrDefault();

			FindingEvidenceDocument? ev = null;
			try
			{
				ev = await _mongoDbContext.FindingsEvidence.Find(e => e.FindingId == issue.Id).FirstOrDefaultAsync(cancellationToken);
			}
			catch
			{
				// Mongo fallback
			}

			return new ReviewItemDto
			{
				Id = issue.Id,
				SessionId = issue.SessionId,
				Title = issue.IssueTitle,
				Topic = issue.Topic,
				Severity = issue.Severity.ToString().ToLower(),
				Interval = issue.TimeRange,
				Observation = ev != null ? $"Quan sát: {ev.Kind} trên {issue.Topic}." : $"Bất thường trên topic {issue.Topic}.",
				Hypothesis = "Nguồn phát có thể bị gián đoạn. Cần kỹ sư đối chiếu và xác nhận.",
				Steps = ev?.Steps ?? new List<string> { "Đối chiếu log /rosout" },
				Status = audit != null ? audit.Decision.ToString().ToLower() : "pending",
				Note = audit?.ReviewNote,
				ReviewedBy = audit?.ReviewerId,
				ReviewedAt = audit?.ReviewedAt.ToString("o")
			};
		}
	}
}
