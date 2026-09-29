using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.AboutUser;
using Domain.Entities.Config;

namespace Domain.Entities.Configuration
{
	public class AnalysisConfig : BaseEntity
	{
		[Required]
		[Column("user_id")]
		public string UserId { get; set; } = null!;

		[ForeignKey(nameof(UserId))]
		public virtual User User { get; set; } = null!;

		[Column("freq_tolerance_hz")]
		public float FreqToleranceHz { get; set; } = 0.5f;

		[Column("max_latency_ms")]
		public int MaxLatencyMs { get; set; } = 500;

		[Column("packet_drop_percent")]
		public float PacketDropPercent { get; set; } = 5.0f;

		[Column("memory_limit_mb")]
		public int MemoryLimitMb { get; set; } = 2048;

		[Column("auto_diagnose")]
		public bool AutoDiagnose { get; set; } = true;

		[Column("strict_evidence")]
		public bool StrictEvidence { get; set; } = true;

		[Column("high_severity_alert")]
		public bool HighSeverityAlert { get; set; } = true;
	}
}
