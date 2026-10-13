using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.ManageTransaction;
using Application.Features.UserProfile.DTOs;

namespace Application.Features.UserProfile.Queries
{
	public class GetMyProfileQueryHandler : IRequestHandler<GetMyProfileQuery, UserProfileDto?>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetMyProfileQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<UserProfileDto?> Handle(GetMyProfileQuery request, CancellationToken cancellationToken)
		{
			var user = await _unitOfWork.User.GetAsync(
				u => u.Id == request.UserId,
				cancellationToken: cancellationToken);

			if (user == null) return null;

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
