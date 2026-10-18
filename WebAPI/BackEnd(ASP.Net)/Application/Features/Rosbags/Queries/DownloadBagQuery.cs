using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.ManageTransaction;
using MediatR;

namespace Application.Features.Rosbags.Queries
{
	public record DownloadBagQuery(string Id, string? UserId, bool CanAccessAll) : IRequest<RosbagDownloadResult?>;

	public class DownloadBagQueryHandler : IRequestHandler<DownloadBagQuery, RosbagDownloadResult?>
	{
		private readonly IUnitOfWork _unitOfWork;

		public DownloadBagQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<RosbagDownloadResult?> Handle(DownloadBagQuery request, CancellationToken cancellationToken)
		{
			var bag = await _unitOfWork.Rosbags.GetByIdAsync(request.Id, cancellationToken);
			if (bag == null || bag.DeletedAt != null) return null;

			// Kiểm tra quyền: Admin/Engineering hoặc chính chủ sở hữu file
			if (!request.CanAccessAll && bag.UserId != request.UserId)
			{
				throw new UnauthorizedAccessException("Bạn không có quyền tải xuống rosbag này.");
			}

			if (string.IsNullOrWhiteSpace(bag.StorageUrl) || !File.Exists(bag.StorageUrl))
			{
				throw new FileNotFoundException("Tệp tin rosbag không tồn tại trên hệ thống lưu trữ máy chủ.");
			}

			var stream = new FileStream(bag.StorageUrl, FileMode.Open, FileAccess.Read, FileShare.Read);
			var fileName = !string.IsNullOrWhiteSpace(bag.FileName) ? Path.GetFileName(bag.FileName) : $"{bag.Id}.db3";

			return new RosbagDownloadResult
			{
				Stream = stream,
				FileName = fileName,
				ContentType = "application/octet-stream"
			};
		}
	}
}
