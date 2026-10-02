using System;
using Domain.Common;

namespace Domain.Entities.Notifications
{
	public class Notification : BaseEntity
	{
		public string? Title { get; set; }

		public string? Message { get; set; }

		public bool? IsRead { get; set; }

		public string? Type { get; set; }

		public string? RelatedEntityId { get; set; }

		public virtual Domain.Entities.Identity.User? User { get; set; }
	}
}
