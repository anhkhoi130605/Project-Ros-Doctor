using System;
using System.Collections.Generic;
using System.Text;
using Domain.Common;
using static Domain.Enums.UserEnum;

namespace Domain.Entities.Identity
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
