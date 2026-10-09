using System;
using System.Net;
using Domain.Common;

namespace Domain.Entities.Identity
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
		public Guid LogId { get; set; }
		public HttpStatusCode StatusSystemResponse { get; set; } = HttpStatusCode.OK;
	}
}
