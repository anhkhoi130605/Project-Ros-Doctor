using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.ConfigModel
{
	public class EmailSettings
	{
		public string SmtpServer { get; set; } = string.Empty;
		public int Port { get; set; }
		public string SenderName { get; set; } = string.Empty;
		public string SenderEmail { get; set; } = string.Empty;
		public string Password { get; set; } = string.Empty;
	}
}
