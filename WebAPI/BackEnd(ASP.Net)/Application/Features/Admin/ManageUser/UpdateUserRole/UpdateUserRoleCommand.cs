using MediatR;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.UpdateUserRole
{
	public class UpdateUserRoleCommand : IRequest<bool>
	{
		public string UserId { get; set; } = null!;
		public RoleEnum Role { get; set; }
	}

	public class UpdateUserRoleRequestDto
	{
		public string Role { get; set; } = null!;
	}
}
