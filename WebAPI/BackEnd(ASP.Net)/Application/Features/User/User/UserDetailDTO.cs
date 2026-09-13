using System;
using System.Collections.Generic;
using System.Text;
using static Domain.Enums.UserEnum;

namespace Application.DTOs.User
{
	public class UserDetailDTO
	{
		public string? Phone { get; set; }
		public string? GoogleId { get; set; }

		// Specific Profile Info
		public string? StudentCode { get; set; }
		public MemberInOrOutClubEnum RoleInOutClub { get; set; }
		public string? DepartmentName { get; set; }
		public string? CurrentSemester { get; set; } // Student
		public string? Position { get; set; } // Staff
		public bool HashPassword { get; set; }
	}
}
