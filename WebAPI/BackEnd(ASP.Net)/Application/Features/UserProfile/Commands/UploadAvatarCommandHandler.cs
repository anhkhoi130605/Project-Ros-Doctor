using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Storage;

namespace Application.Features.UserProfile.Commands
{
	public class UploadAvatarCommandHandler : IRequestHandler<UploadAvatarCommand, string>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IStorageService _storageService;

		public UploadAvatarCommandHandler(IUnitOfWork unitOfWork, IStorageService storageService)
		{
			_unitOfWork = unitOfWork;
			_storageService = storageService;
		}

		public async Task<string> Handle(UploadAvatarCommand request, CancellationToken cancellationToken)
		{
			var user = await _unitOfWork.User.GetAsync(u => u.Id == request.UserId, cancellationToken: cancellationToken);
			if (user == null)
			{
				throw new KeyNotFoundException("User not found");
			}

			// 1. Upload lên Cloudinary
			var avatarUrl = await _storageService.UploadAsync(request.FileStream, request.FileName);

			// 2. Cập nhật AvatarUrl trong database
			user.AvatarUrl = avatarUrl;
			await _unitOfWork.User.UpdateAsync(user, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			return avatarUrl;
		}
	}
}
