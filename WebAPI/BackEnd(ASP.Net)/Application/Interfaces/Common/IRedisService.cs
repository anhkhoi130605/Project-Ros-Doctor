using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces.Common
{
	public class AnalysisProgressModel
	{
		public int Percent { get; set; }
		public string CurrentStep { get; set; } = string.Empty;
		public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
	}

	public class ChatMessageBufferModel
	{
		public string Sender { get; set; } = string.Empty; // USER or AGENT
		public string Message { get; set; } = string.Empty;
		public DateTime Timestamp { get; set; } = DateTime.UtcNow;
	}

	public interface IRedisService
	{
		// 1. Progress Tracking (Hashes: session:{id}:progress)
		Task SetAnalysisProgressAsync(string sessionId, int percent, string currentStep);
		Task<AnalysisProgressModel?> GetAnalysisProgressAsync(string sessionId);

		// 2. Realtime Pub/Sub (channel:analysis_complete)
		Task PublishAsync(string channel, string message);

		// 3. Short-term Chat Buffer (List: chat:{sessionId}:messages)
		Task PushChatMessageAsync(string sessionId, string sender, string message, int maxRecent = 10);
		Task<List<ChatMessageBufferModel>> GetRecentChatMessagesAsync(string sessionId, int count = 10);

		// 4. Rate Limiting (String with TTL: ratelimit:{userId}:minute)
		Task<bool> CheckRateLimitAsync(string userId, int limitPerMinute = 60);

		// 5. Cache (cache:dashboard:overview, TTL)
		Task<T?> GetCacheAsync<T>(string key);
		Task SetCacheAsync<T>(string key, T data, TimeSpan ttl);
		Task RemoveCacheAsync(string key);

		// 6. Token Blacklist (Set: blacklist:tokens)
		Task BlacklistTokenAsync(string token, TimeSpan ttl);
		Task<bool> IsTokenBlacklistedAsync(string token);
	}
}
