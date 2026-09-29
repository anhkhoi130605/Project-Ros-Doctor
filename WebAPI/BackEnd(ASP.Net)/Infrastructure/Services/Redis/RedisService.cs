using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.Common;
using StackExchange.Redis;

namespace Infrastructure.Services.Redis
{
	public class RedisService : IRedisService
	{
		private readonly IConnectionMultiplexer _redis;
		private readonly IDatabase _db;

		public RedisService(IConnectionMultiplexer redis)
		{
			_redis = redis;
			_db = _redis.GetDatabase();
		}

		// 1. Progress Tracking (Hashes: session:{id}:progress)
		public async Task SetAnalysisProgressAsync(string sessionId, int percent, string currentStep)
		{
			var key = $"session:{sessionId}:progress";
			var entries = new HashEntry[]
			{
				new("percent", percent),
				new("current_step", currentStep),
				new("updated_at", DateTime.UtcNow.ToString("O"))
			};
			await _db.HashSetAsync(key, entries);
			await _db.KeyExpireAsync(key, TimeSpan.FromHours(24));
		}

		public async Task<AnalysisProgressModel?> GetAnalysisProgressAsync(string sessionId)
		{
			var key = $"session:{sessionId}:progress";
			var entries = await _db.HashGetAllAsync(key);
			if (entries.Length == 0) return null;

			var model = new AnalysisProgressModel();
			foreach (var entry in entries)
			{
				if (entry.Name == "percent" && int.TryParse(entry.Value.ToString(), out var p))
					model.Percent = p;
				else if (entry.Name == "current_step")
					model.CurrentStep = entry.Value.ToString();
				else if (entry.Name == "updated_at" && DateTime.TryParse(entry.Value.ToString(), out var dt))
					model.UpdatedAt = dt;
			}
			return model;
		}

		// 2. Realtime Pub/Sub (channel:analysis_complete)
		public async Task PublishAsync(string channel, string message)
		{
			var subscriber = _redis.GetSubscriber();
			await subscriber.PublishAsync(RedisChannel.Literal(channel), message);
		}

		// 3. Short-term Chat Buffer (List: chat:{sessionId}:messages)
		public async Task PushChatMessageAsync(string sessionId, string sender, string message, int maxRecent = 10)
		{
			var key = $"chat:{sessionId}:messages";
			var payload = JsonSerializer.Serialize(new ChatMessageBufferModel
			{
				Sender = sender,
				Message = message,
				Timestamp = DateTime.UtcNow
			});

			await _db.ListRightPushAsync(key, payload);
			// Trim to keep only the latest maxRecent items
			await _db.ListTrimAsync(key, -maxRecent, -1);
			await _db.KeyExpireAsync(key, TimeSpan.FromDays(7));
		}

		public async Task<List<ChatMessageBufferModel>> GetRecentChatMessagesAsync(string sessionId, int count = 10)
		{
			var key = $"chat:{sessionId}:messages";
			var values = await _db.ListRangeAsync(key, -count, -1);
			var result = new List<ChatMessageBufferModel>();

			foreach (var val in values)
			{
				if (!val.IsNullOrEmpty)
				{
					var msg = JsonSerializer.Deserialize<ChatMessageBufferModel>(val.ToString());
					if (msg != null) result.Add(msg);
				}
			}
			return result;
		}

		// 4. Rate Limiting (String with TTL: ratelimit:{userId}:minute)
		public async Task<bool> CheckRateLimitAsync(string userId, int limitPerMinute = 60)
		{
			var key = $"ratelimit:{userId}:minute";
			var current = await _db.StringIncrementAsync(key);
			if (current == 1)
			{
				await _db.KeyExpireAsync(key, TimeSpan.FromSeconds(60));
			}
			return current <= limitPerMinute;
		}

		// 5. Cache (cache:dashboard:overview, TTL)
		public async Task<T?> GetCacheAsync<T>(string key)
		{
			var val = await _db.StringGetAsync(key);
			if (val.IsNullOrEmpty) return default;
			return JsonSerializer.Deserialize<T>(val.ToString());
		}

		public async Task SetCacheAsync<T>(string key, T data, TimeSpan ttl)
		{
			var json = JsonSerializer.Serialize(data);
			await _db.StringSetAsync(key, json, ttl);
		}

		public async Task RemoveCacheAsync(string key)
		{
			await _db.KeyDeleteAsync(key);
		}

		// 6. Token Blacklist (Set: blacklist:tokens)
		public async Task BlacklistTokenAsync(string token, TimeSpan ttl)
		{
			var key = $"blacklist:token:{token}";
			await _db.StringSetAsync(key, "revoked", ttl);
		}

		public async Task<bool> IsTokenBlacklistedAsync(string token)
		{
			var key = $"blacklist:token:{token}";
			return await _db.KeyExistsAsync(key);
		}
	}
}
