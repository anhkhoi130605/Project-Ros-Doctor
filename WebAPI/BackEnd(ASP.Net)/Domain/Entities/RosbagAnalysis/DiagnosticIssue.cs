using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Common;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	public class DiagnosticIssue : BaseEntity
	{
		[Required]
		[Column("session_id")]
		public string SessionId { get; set; } = null!;

		[ForeignKey(nameof(SessionId))]
		public virtual AnalysisSession Session { get; set; } = null!;

		[MaxLength(100)]
		[Column("topic")]
		public string? Topic { get; set; }

		[Column("severity")]
		public IssueSeverity Severity { get; set; } = IssueSeverity.MEDIUM;

		[MaxLength(50)]
		[Column("time_range")]
		public string? TimeRange { get; set; }

		[Required]
		[MaxLength(255)]
		[Column("issue_title")]
		public string IssueTitle { get; set; } = null!;

		public virtual ICollection<ReviewAuditLog> ReviewAuditLogs { get; set; } = new HashSet<ReviewAuditLog>();
	}
}
