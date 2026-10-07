using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTransaction;

namespace Application.Features.Rosbags.Queries
{
	public record GetBagsQuery(int? PageNumber = null, int? PageSize = null) : IRequest<List<RosbagDto>>;

	public class GetBagsQueryHandler : IRequestHandler<GetBagsQuery, List<RosbagDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetBagsQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<RosbagDto>> Handle(GetBagsQuery request, CancellationToken cancellationToken)
		{
			int? skip = null;
			int? take = null;

			if (request.PageNumber.HasValue && request.PageSize.HasValue)
			{
				var pNum = System.Math.Max(1, request.PageNumber.Value);
				var pSize = System.Math.Clamp(request.PageSize.Value, 1, 100);
				skip = (pNum - 1) * pSize;
				take = pSize;
			}

			// Projection query at SQL level with AsNoTracking
			var bagsList = await _unitOfWork.Rosbags.SelectAsync(
				b => new
				{
					b.Id,
					Name = b.FileName,
					b.StorageUrl,
					Size = b.SizeBytes,
					Format = b.Format.ToString(),
					Duration = b.DurationSec,
					Topics = b.TopicCount,
					Status = b.Status.ToString().ToLower(),
					Date = b.CreatedAt.ToString("o"),
					b.UserId
				},
				null,
				q => q.OrderByDescending(b => b.CreatedAt),
				skip,
				take,
				cancellationToken);

			if (bagsList.Count == 0) return new List<RosbagDto>();

			var bagIds = bagsList.Select(b => b.Id).ToHashSet();
			var sessions = bagIds.Count > 0
				? await _unitOfWork.AnalysisSessions.GetAllAsync(s => bagIds.Contains(s.RosbagId), null, cancellationToken)
				: System.Linq.Enumerable.Empty<Domain.Entities.RosbagAnalysis.AnalysisSession>();

			var sessionMap = sessions
				.OrderByDescending(s => s.StartedAt)
				.GroupBy(s => s.RosbagId)
				.ToDictionary(g => g.Key, g => g.First());

			return bagsList
				.Select(b =>
				{
					var hasSession = sessionMap.TryGetValue(b.Id, out var sess);
					return new RosbagDto
					{
						Id = b.Id,
						Name = b.Name,
						StorageUrl = b.StorageUrl,
						Size = b.Size,
						Format = b.Format,
						Duration = b.Duration,
						Topics = b.Topics,
						Status = b.Status,
						Date = b.Date,
						SessionId = hasSession && sess != null ? sess.Id : null,
						ProcessingSeconds = hasSession && sess != null ? sess.ExecutionTimeSec : 0,
						UserId = b.UserId
					};
				})
				.ToList();
		}
	}
}
