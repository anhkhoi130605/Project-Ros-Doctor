using System;
using System.Net;
using Domain.Entities.Config;

namespace Domain.Entities.System
{
	public class SystemErrorLog : BaseEntity
	{
		public string LogLevel { get; set; } = "Error";
		public string ExceptionType { get; set; } = string.Empty;
		public string ErrorMessage { get; set; } = string.Empty;
		public string TranslatedMessage { get; set; } = string.Empty;
		public string? StackTrace { get; set; }
		public string? RequestPath { get; set; }
		public string? HttpMethod { get; set; }
		public HttpStatusCode StatusCode { get; set; }
		public string? UserId { get; set; }
		public string? IpAddress { get; set; }
		public string? UserAgent { get; set; }
	}
}
