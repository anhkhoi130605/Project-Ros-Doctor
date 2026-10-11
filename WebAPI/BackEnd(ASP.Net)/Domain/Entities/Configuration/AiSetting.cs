using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Common;
using Domain.Entities.Identity;

namespace Domain.Entities.Configuration
{
	public class AiSetting : BaseEntity
	{
		[Required]
		public string UserId { get; set; } = null!;
		public virtual User User { get; set; } = null!;

		[Column("daily_call_limit")]
		public int DailyCallLimit { get; set; } = 100;

		[Column("rate_limit_per_min")]
		public int RateLimitPerMin { get; set; } = 10;

		[Column("max_tokens_per_call")]
		public int MaxTokensPerCall { get; set; } = 4000;

		[Column("monthly_budget_usd", TypeName = "decimal(10,2)")]
		public decimal MonthlyBudgetUsd { get; set; } = 25.00m;

		[MaxLength(255)]
		[Column("vector_db_url")]
		public string VectorDbUrl { get; set; } = "http://localhost:8333";

		[Column("system_prompt")]
		public string? SystemPrompt { get; set; }
	}
}
