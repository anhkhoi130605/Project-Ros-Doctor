using System;
using Domain.Entities.Config;

namespace Domain.Entities.System
{
	public class SystemErrorLog : BaseEntity
	{
		public string LogLevel { get; set; } = "Error"; // Error, Critical, Warning, Info
		public string ExceptionType { get; set; } = string.Empty; // e.g., ArgumentException, MySqlException
		public string ErrorMessage { get; set; } = string.Empty; // Raw message from Exception
		public string TranslatedMessage { get; set; } = string.Empty; // Vietnamese explanation of what went wrong
		public string? StackTrace { get; set; }
		public string? RequestPath { get; set; }
		public string? HttpMethod { get; set; }
		public SystemLogStatusEnum StatusCode { get; set; } ;
		public string? UserId { get; set; }
		public string? IpAddress { get; set; }
		public string? UserAgent { get; set; }
	}
}
