using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Rosbags.Queries
{
	public record GetBagsQuery() : IRequest<List<RosbagDto>>;

	public class GetBagsQueryHandler : IRequestHandler<GetBagsQuery, List<RosbagDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetBagsQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<RosbagDto>> Handle(GetBagsQuery request, CancellationToken cancellationToken)
		{
			var bags = await _unitOfWork.Rosbags.GetAllAsync(null, null, cancellationToken);
			var sessions = await _unitOfWork.AnalysisSessions.GetAllAsync(null, null, cancellationToken);

			var sessionMap = sessions
				.OrderByDescending(s => s.StartedAt)
				.GroupBy(s => s.RosbagId)
				.ToDictionary(g => g.Key, g => g.First().Id);

			return bags
				.OrderByDescending(b => b.CreatedAt)
				.Select(b => new RosbagDto
				{
					Id = b.Id,
					Name = b.FileName,
					StorageUrl = b.StorageUrl,
					Size = b.SizeBytes,
					Format = b.Format.ToString(),
					Duration = b.DurationSec,
					Topics = b.TopicCount,
					Status = b.Status.ToString().ToLower(),
					Date = b.CreatedAt.ToString("o"),
					SessionId = sessionMap.TryGetValue(b.Id, out var sId) ? sId : null,
					UserId = b.UserId
				})
				.ToList();
		}
	}
}
