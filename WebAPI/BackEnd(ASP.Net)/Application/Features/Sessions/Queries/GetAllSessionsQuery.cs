using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Sessions.DTOs;
using Application.Interfaces.ManageTransaction;
using MediatR;

namespace Application.Features.Sessions.Queries
{
	public record GetAllSessionsQuery(int Page = 1, int PageSize = 50) : IRequest<List<SessionDetailDto>>;

	public class GetAllSessionsQueryHandler : IRequestHandler<GetAllSessionsQuery, List<SessionDetailDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetAllSessionsQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<SessionDetailDto>> Handle(GetAllSessionsQuery request, CancellationToken cancellationToken)
		{
			var sessions = (await _unitOfWork.AnalysisSessions.GetAllAsync(null, null, cancellationToken))
				.OrderByDescending(s => s.StartedAt)
				.Take(request.PageSize)
				.ToList();

			if (sessions.Count == 0) return new List<SessionDetailDto>();

			var bagIds = sessions.Select(s => s.RosbagId).Distinct().ToHashSet();
			var bags = (await _unitOfWork.Rosbags.GetAllAsync(b => bagIds.Contains(b.Id), null, cancellationToken))
				.ToDictionary(b => b.Id);

			var sessionIds = sessions.Select(s => s.Id).ToHashSet();
			var issues = (await _unitOfWork.DiagnosticIssues.GetAllAsync(i => sessionIds.Contains(i.SessionId), null, cancellationToken))
				.GroupBy(i => i.SessionId)
				.ToDictionary(g => g.Key, g => g.ToList());

			return sessions.Select(s =>
			{
				bags.TryGetValue(s.RosbagId, out var bag);
				issues.TryGetValue(s.Id, out var sIssues);

				return new SessionDetailDto
				{
					Id = s.Id,
					BagId = s.RosbagId,
					Name = bag?.FileName ?? "ROS2 Bag",
					Duration = bag?.DurationSec ?? 0,
					Topics = bag?.TopicCount ?? 0,
					Messages = 387000,
					Status = s.Status.ToString().ToLower(),
					HealthScore = s.HealthScore,
					ProcessingSeconds = s.ExecutionTimeSec,
					CreatedAt = s.StartedAt.ToString("o"),
					Issues = (sIssues ?? new List<Domain.Entities.RosbagAnalysis.DiagnosticIssue>()).Select(i => new DiagnosticIssueDto
					{
						Id = i.Id,
						SessionId = i.SessionId,
						Title = i.IssueTitle,
						Topic = i.Topic,
						Severity = i.Severity.ToString().ToLower(),
						Observation = $"Phát hiện bất thường trên {i.Topic} trong khoảng {i.TimeRange}."
					}).ToList()
				};
			}).ToList();
		}
	}
}
