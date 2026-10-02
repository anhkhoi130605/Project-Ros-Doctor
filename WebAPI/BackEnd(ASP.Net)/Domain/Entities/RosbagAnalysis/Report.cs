using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Entities.Config;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	public class Report : BaseEntity
	{
		[Required]
		[Column("session_id")]
		public string SessionId { get; set; } = null!;

		[ForeignKey(nameof(SessionId))]
		public virtual AnalysisSession Session { get; set; } = null!;

		[Column("reviewer_id")]
		public string? ReviewerId { get; set; }

		[ForeignKey(nameof(ReviewerId))]
		public virtual User? Reviewer { get; set; }

		[Required]
		[MaxLength(255)]
		[Column("title")]
		public string Title { get; set; } = null!;

		[Column("status")]
		public ReportStatus Status { get; set; } = ReportStatus.Pending;

		[Column("approved_conclusion_count")]
		public int ApprovedConclusionCount { get; set; } = 0;

		[Column("published_at")]
		public DateTime? PublishedAt { get; set; }
	}
}
