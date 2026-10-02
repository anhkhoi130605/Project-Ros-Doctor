using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Entities.Config;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	[Table("review_audit_logs")]
	public class ReviewAuditLog : BaseEntity
	{
		[Required]
		[Column("finding_id")]
		public string FindingId { get; set; } = null!;

		[ForeignKey(nameof(FindingId))]
		public virtual DiagnosticIssue Finding { get; set; } = null!;

		[Column("decision")]
		public ReviewStatus Decision { get; set; } = ReviewStatus.Approved;

		[Required]
		[Column("reviewer_id")]
		public string ReviewerId { get; set; } = null!;

		[ForeignKey(nameof(ReviewerId))]
		public virtual User Reviewer { get; set; } = null!;

		[MaxLength(1000)]
		[Column("review_note")]
		public string? ReviewNote { get; set; }

		[Column("reviewed_at")]
		public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
	}
}
