using System;
using System.Collections.Generic;
using System.Text;

namespace Infrastructure.Persistence.Configurations.AuthenticationConfig
{
	public class JWTConfiguration
	{
      public string Issuer { get; set; } = string.Empty;
		public string Audience { get; set; } = string.Empty;

		// Number of minutes before token expiry
		public int ExpiresMinutes { get; set; } = 60;

		// Symmetric key (secret) used to sign tokens
		public string Key { get; set; } = string.Empty;

	}
}
