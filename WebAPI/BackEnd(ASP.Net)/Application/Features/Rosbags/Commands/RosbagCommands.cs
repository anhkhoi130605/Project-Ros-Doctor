using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;

namespace Application.Features.Rosbags.Commands
{
	public record CreateRosbagCommand(CreateRosbagRequestDto Request, string UserId) : IRequest<RosbagDto>;

	public class CreateRosbagCommandHandler : IRequestHandler<CreateRosbagCommand, RosbagDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public CreateRosbagCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<RosbagDto> Handle(CreateRosbagCommand command, CancellationToken cancellationToken)
		{
			var format = Enum.TryParse<RosbagFormat>(command.Request.Format, true, out var f) ? f : RosbagFormat.MCAP;

			var rosbag = new Rosbag
			{
				Id = "bag-" + Guid.NewGuid().ToString("N")[..8],
				UserId = command.UserId,
				FileName = command.Request.Name,
				StorageUrl = command.Request.StorageUrl,
				SizeBytes = command.Request.Size,
				Format = format,
				DurationSec = command.Request.Duration,
				TopicCount = command.Request.Topics,
				Status = RosbagStatus.Ready,
				CreatedAt = DateTime.UtcNow
			};

			await _unitOfWork.Rosbags.CreateAsync(rosbag, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			return new RosbagDto
			{
				Id = rosbag.Id,
				Name = rosbag.FileName,
				StorageUrl = rosbag.StorageUrl,
				Size = rosbag.SizeBytes,
				Format = rosbag.Format.ToString(),
				Duration = rosbag.DurationSec,
				Topics = rosbag.TopicCount,
				Status = rosbag.Status.ToString().ToLower(),
				Date = rosbag.CreatedAt.ToString("o"),
				UserId = rosbag.UserId
			};
		}
	}

	public record DeleteRosbagCommand(string Id) : IRequest<bool>;

	public class DeleteRosbagCommandHandler : IRequestHandler<DeleteRosbagCommand, bool>
	{
		private readonly IUnitOfWork _unitOfWork;

		public DeleteRosbagCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<bool> Handle(DeleteRosbagCommand command, CancellationToken cancellationToken)
		{
			var bag = await _unitOfWork.Rosbags.GetByIdAsync(command.Id, cancellationToken);
			if (bag == null) return false;

			await _unitOfWork.Rosbags.RemoveAsync(bag, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);
			return true;
		}
	}
}
