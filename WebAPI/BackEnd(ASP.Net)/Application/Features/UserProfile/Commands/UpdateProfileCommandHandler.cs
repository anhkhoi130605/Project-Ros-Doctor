using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.ManageTransaction;
using Application.Features.UserProfile.DTOs;

namespace Application.Features.UserProfile.Commands
{
	public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, UserProfileDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public UpdateProfileCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<UserProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
		{
			var user = await _unitOfWork.User.GetAsync(
				u => u.Id == request.UserId,
				cancellationToken: cancellationToken);

			if (user == null)
			{
				throw new KeyNotFoundException("User not found");
			}

			if (!string.IsNullOrWhiteSpace(request.Dto.FullName))
			{
				user.FullName = request.Dto.FullName.Trim();
			}
			user.Phone = request.Dto.Phone?.Trim();
			user.Bio = request.Dto.Bio?.Trim();

			await _unitOfWork.User.UpdateAsync(user, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			var role = !string.IsNullOrEmpty(user.RoleId) 
				? (await _unitOfWork.Roles.GetAsync(r => r.Id == user.RoleId, cancellationToken: cancellationToken))?.RoleName?.ToString() 
				: null;

			return new UserProfileDto
			{
				Id = user.Id,
				UserName = user.UserName,
				Email = user.Email,
				FullName = user.FullName,
				Phone = user.Phone,
				AvatarUrl = user.AvatarUrl,
				Bio = user.Bio,
				Role = role ?? user.RoleId,
				Status = user.Status?.ToString()
			};
		}
	}
}
