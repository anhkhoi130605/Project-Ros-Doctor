using System;
using Domain.Entities.Config;
using static Domain.Enums.SystemLog;

namespace Domain.Entities.AboutUser
{
	public class UserActivityLog : BaseEntity
	{
		public string? UserId { get; set; }
		public virtual User? User { get; set; }
		public string? UserName { get; set; }
		public string? Email { get; set; }
		public string Action { get; set; } = string.Empty;
		public string? EntityType { get; set; }
		public string? EntityId { get; set; }
		public string? RequestPath { get; set; }
		public string? HttpMethod { get; set; }
		public string? IpAddress { get; set; }
		public string? UserAgent { get; set; }
		public SystemLogStatusEnum StatusSystemResponse { get; set; }
	}
}
