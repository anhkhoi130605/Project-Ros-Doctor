using System;

namespace Infrastructure.Persistence.Configurations.AuthenticationConfig
{
	public class CloudinaryConfiguration
	{
		public string CloudName { get; set; } = string.Empty;
		public string ApiKey { get; set; } = string.Empty;
		public string ApiSecret { get; set; } = string.Empty;
	}
}
