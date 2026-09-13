using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.AboutUser;
using Domain.Entities.Config;

namespace Domain.Entities.Information
{
	public class BlackList : BaseEntity
	{
		//public string UserId { get; set; } = null!;

		public User? User { get; set; }

		public string Reason { get; set; } = null!;
	}
}
