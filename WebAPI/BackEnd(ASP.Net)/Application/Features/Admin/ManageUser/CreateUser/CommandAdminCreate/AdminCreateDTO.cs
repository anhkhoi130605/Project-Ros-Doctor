using System;
using System.Collections.Generic;
using System.Text;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate
{
	public record AdminCreateDTO
	{
		public required string? Email{ get; init; }
		public required string? FullName{ get; init; }
		public required RoleEnum Role{ get; init; }
		public required UserStatusEnum Status{ get; init; }
		public required string PasswordHash { get; init; } // Consider security implications of including password in DTO
		public Gender? Gender { get; init; }
		public MemberInOrOutClubEnum MemberInOrOutClub { get; init; }
	}
}
