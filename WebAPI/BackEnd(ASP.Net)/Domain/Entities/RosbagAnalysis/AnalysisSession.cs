using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Config;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	public class AnalysisSession : BaseEntity
	{
		[Required]
		[Column("rosbag_id")]
		public string RosbagId { get; set; } = null!;

		[ForeignKey(nameof(RosbagId))]
		public virtual Rosbag Rosbag { get; set; } = null!;

		[Column("engineer_id")]
		public string? EngineerId { get; set; }

		[ForeignKey(nameof(EngineerId))]
		public virtual Domain.Entities.AboutUser.User? Engineer { get; set; }

		[Column("result_code")]
		public SessionResultCode? ResultCode { get; set; }

		[Column("status")]
		public SessionStatus Status { get; set; } = SessionStatus.Processing;

		[Column("health_score")]
		public int HealthScore { get; set; } = 100;

		[Column("execution_time_sec")]
		public int ExecutionTimeSec { get; set; } = 0;

		[Column("started_at")]
		public DateTime StartedAt { get; set; } = DateTime.UtcNow;

		[Column("completed_at")]
		public DateTime? CompletedAt { get; set; }

		public virtual Report? Report { get; set; }

		public virtual ICollection<DiagnosticIssue> DiagnosticIssues { get; set; } = new HashSet<DiagnosticIssue>();

		public virtual ICollection<AiUsageLog> AiUsageLogs { get; set; } = new HashSet<AiUsageLog>();
	}
}
