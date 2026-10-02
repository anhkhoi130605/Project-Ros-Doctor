using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTransaction;

namespace Application.Features.Rosbags.Queries
{
	public record GetBagByIdQuery(string Id) : IRequest<BagDetailDto?>;

	public class GetBagByIdQueryHandler : IRequestHandler<GetBagByIdQuery, BagDetailDto?>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetBagByIdQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<BagDetailDto?> Handle(GetBagByIdQuery request, CancellationToken cancellationToken)
		{
			var bag = await _unitOfWork.Rosbags.GetByIdAsync(request.Id, cancellationToken);
			if (bag == null) return null;

			var sessions = await _unitOfWork.AnalysisSessions.GetAllAsync(null, null, cancellationToken);
			var session = sessions.Where(s => s.RosbagId == bag.Id).OrderByDescending(s => s.StartedAt).FirstOrDefault();

			return new BagDetailDto
			{
				Id = bag.Id,
				Name = bag.FileName,
				StorageUrl = bag.StorageUrl,
				Size = bag.SizeBytes,
				Format = bag.Format.ToString(),
				Duration = bag.DurationSec,
				Topics = bag.TopicCount,
				Status = bag.Status.ToString().ToLower(),
				Date = bag.CreatedAt.ToString("o"),
				SessionId = session?.Id,
				UserId = bag.UserId,
				HealthScore = session?.HealthScore ?? 100,
				TotalMessages = session != null ? 350000 : 0
			};
		}
	}
}
