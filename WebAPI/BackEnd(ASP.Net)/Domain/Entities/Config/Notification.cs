using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.AboutUser;
namespace Domain.Entities.Config
{
	public class Notification : BaseEntity
	{
		//public string? UserId { get; set; }

		public string? Title { get; set; }

		public string? Message { get; set; }

		public bool? IsRead { get; set; }

		public string? Type { get; set; }

		public string? RelatedEntityId { get; set; }

		//public DateTime? CreatedAt { get; set; }

		public virtual User? User { get; set; }
	}
}
