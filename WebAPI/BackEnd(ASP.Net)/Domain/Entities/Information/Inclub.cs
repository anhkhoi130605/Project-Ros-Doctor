using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.Config;
using Domain.Entities.AboutUser;
using static Domain.Enums.List;

namespace Domain.Entities.Information
{
	public class Inclub : BaseEntity
	{
		public virtual ProfileUser? ProfileUser { get; set; } = null!;

		public string ClubId { get; set; } = null!;

		public DateTime? JoinedDate { get; set; }

		public string? Role { get; set; }

		public string? Position { get; set; }

		public bool? IsActive { get; set; }

		public string? Department { get; set; }

		public string? Email { get; set; }

		public string? Phone { get; set; }

		public IsBlackListEnum IsBlackList { get; set; }

		public IsActiveClubEnum? IsActiveClub { get; set; }

		public virtual User? User { get; set; }
	}
}
