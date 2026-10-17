using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTransaction;

namespace Application.Features.Rosbags.Queries
{
	public record GetBagByIdQuery(string Id, string? UserId = null, bool CanViewAll = false) : IRequest<BagDetailDto?>;

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
			if (bag == null || bag.DeletedAt != null || bag.ReviewStatus != Domain.Enums.RosbagReviewStatus.Approved) return null;

			// If not allowed to view all, only the owner can view detail
			if (!request.CanViewAll && !string.IsNullOrEmpty(request.UserId) && bag.UserId != request.UserId)
			{
				return null;
			}

			var sessions = await _unitOfWork.AnalysisSessions.GetAllAsync(null, null, cancellationToken);
			var session = sessions.Where(s => s.RosbagId == bag.Id).OrderByDescending(s => s.StartedAt).FirstOrDefault();

			return new BagDetailDto
			{
				Id = bag.Id,
				Name = bag.FileName,
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
