using System;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Application.Interfaces;

namespace Infrastructure.Services
{
	public class OtpService : IOtpService
	{
		private readonly IDistributedCache _cache;

		public OtpService(IDistributedCache cache)
		{
			_cache = cache;
		}

		public async Task<string> GenerateAndSaveOtpAsync(string target)
		{
			// Cryptographically secure 6-digit OTP generation
			string code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
			string cacheKey = $"otp:{target.ToLowerInvariant().Trim()}";

			var options = new DistributedCacheEntryOptions
			{
				AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
			};

			await _cache.SetStringAsync(cacheKey, code, options);
			return code;
		}

		public async Task<bool> ValidateOtpAsync(string target, string code)
		{
			if (string.IsNullOrWhiteSpace(code)) return false;

			string cacheKey = $"otp:{target.ToLowerInvariant().Trim()}";
			string? cachedOtp = await _cache.GetStringAsync(cacheKey);

			if (cachedOtp != null && cachedOtp.Equals(code.Trim(), StringComparison.OrdinalIgnoreCase))
			{
				await _cache.RemoveAsync(cacheKey);
				return true;
			}

			return false;
		}
	}
}
