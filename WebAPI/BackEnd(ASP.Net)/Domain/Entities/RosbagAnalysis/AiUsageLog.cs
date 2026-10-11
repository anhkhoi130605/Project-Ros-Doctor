using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Common;

namespace Domain.Entities.RosbagAnalysis
{
	[Table("llm_usage_ledger")]
	public class AiUsageLog : BaseEntity
	{
		[Required]
		[Column("session_id")]
		public string SessionId { get; set; } = null!;

		[ForeignKey(nameof(SessionId))]
		public virtual AnalysisSession Session { get; set; } = null!;

		[Required]
		[MaxLength(50)]
		[Column("model_name")]
		public string ModelName { get; set; } = null!;

		[Column("prompt_tokens")]
		public int PromptTokens { get; set; }

		[Column("completion_tokens")]
		public int CompletionTokens { get; set; }

		[Column("cost_usd", TypeName = "decimal(10,4)")]
		public decimal CostUsd { get; set; }

		[Column("latency_ms")]
		public int LatencyMs { get; set; }
	}
}
