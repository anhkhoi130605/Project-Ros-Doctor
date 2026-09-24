using System;
using System.Collections.Concurrent;

namespace Application.Features.Authentication.Password
{
	public static class OtpStore
	{
		private class OtpEntry
		{
			public string OtpCode { get; set; } = string.Empty;
			public DateTime ExpiresAt { get; set; }
		}

		private static readonly ConcurrentDictionary<string, OtpEntry> _store = new ConcurrentDictionary<string, OtpEntry>(StringComparer.OrdinalIgnoreCase);

		public static string GenerateAndSaveOtp(string target)
		{
			var random = new Random();
			string code = random.Next(100000, 999999).ToString();
			_store[target] = new OtpEntry
			{
				OtpCode = code,
				ExpiresAt = DateTime.UtcNow.AddMinutes(10)
			};
			return code;
		}

		public static bool ValidateOtp(string target, string code)
		{
			if (string.IsNullOrWhiteSpace(code)) return false;

			if (_store.TryGetValue(target, out var entry))
			{
				if (entry.ExpiresAt >= DateTime.UtcNow && entry.OtpCode.Equals(code.Trim(), StringComparison.OrdinalIgnoreCase))
				{
					_store.TryRemove(target, out _);
					return true;
				}
			}

			return false;
		}
	}
}
