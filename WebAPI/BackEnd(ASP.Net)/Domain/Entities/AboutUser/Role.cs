using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.Config;
using static Domain.Enums.UserEnum;

namespace Domain.Entities.AboutUser
{
   public class Role : BaseEntity
	{
		//public string Id { get; set; } = null!;

		public RoleEnum? RoleName { get; set; } = null!;

		public string? Description { get; set; }

		//public DateTime? CreatedAt { get; set; }

		public virtual ICollection<User> Users { get; set; } = new HashSet<User>();
	}
}
