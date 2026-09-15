using System;
using System.Collections.Generic;
using System.Text;
using static Domain.Enums.UserEnum;

namespace Application.DTOs.Authentication
{
	public class LoggedinUserDTO
	{
		public string Id { get; set; } = default!;
		public string Email { get; set; } = default!;
		public string FullName { get; set; } = default!;
		public string? AvatarUrl { get; set; }
		public string Role { get; set; } = default!;
		public MemberInOrOutClubEnum MemberInOrOutClub { get; set; }
	}
}
