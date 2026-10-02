using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Entities.Config;

namespace Domain.Entities.Configuration
{
	public class SystemThresholdConfig : BaseEntity
	{
		[Required]
		[Column("user_id")]
		public string UserId { get; set; } = null!;

		[ForeignKey(nameof(UserId))]
		public virtual User User { get; set; } = null!;

		[Required]
		[MaxLength(100)]
		[Column("profile_name")]
		public string ProfileName { get; set; } = null!;

		[Column("calc_window_sec")]
		public int CalcWindowSec { get; set; } = 10;

		[Column("topic_timeout_sec")]
		public int TopicTimeoutSec { get; set; } = 3;

		[Column("clock_offset_ms")]
		public int ClockOffsetMs { get; set; } = 30;

		[Column("tf_latency_ms")]
		public int TfLatencyMs { get; set; } = 50;

		[Column("send_stats_only")]
		public bool SendStatsOnly { get; set; } = false;

		[Column("redact_gps")]
		public bool RedactGps { get; set; } = true;

		[Column("audit_trail")]
		public bool AuditTrail { get; set; } = true;

		public virtual ICollection<TopicThresholdRule> TopicThresholdRules { get; set; } = new HashSet<TopicThresholdRule>();
	}
}
