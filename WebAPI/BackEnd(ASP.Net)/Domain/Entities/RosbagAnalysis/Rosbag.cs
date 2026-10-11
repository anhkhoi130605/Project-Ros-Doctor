using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Common;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	public class Rosbag : BaseEntity
	{
		[Required]
		[Column("user_id")]
		public string UserId { get; set; } = null!;

		[ForeignKey(nameof(UserId))]
		public virtual User User { get; set; } = null!;

		[Required]
		[MaxLength(255)]
		[Column("file_name")]
		public string FileName { get; set; } = null!;

		[MaxLength(500)]
		[Column("storage_url")]
		public string? StorageUrl { get; set; }

		[Column("size_bytes")]
		public long SizeBytes { get; set; }

		[Column("format")]
		public RosbagFormat Format { get; set; }

		[Column("duration_sec")]
		public int DurationSec { get; set; }

		[Column("topic_count")]
		public int TopicCount { get; set; } = 0;

		[Column("status")]
		public RosbagStatus Status { get; set; } = RosbagStatus.Ready;

		[Column("is_published")]
		public bool IsPublished { get; set; } = false;

		[Column("review_status")]
		public RosbagReviewStatus ReviewStatus { get; set; } = RosbagReviewStatus.Approved;

		[Column("description")]
		[MaxLength(2000)]
		public string? Description { get; set; }

		[Column("reviewer_id")]
		[MaxLength(36)]
		public string? ReviewerId { get; set; }

		[ForeignKey(nameof(ReviewerId))]
		public virtual User? Reviewer { get; set; }

		[Column("review_note")]
		[MaxLength(2000)]
		public string? ReviewNote { get; set; }

		[Column("reviewed_at")]
		public DateTime? ReviewedAt { get; set; }

		public void EnsureApprovedForAnalysis()
		{
			if (ReviewStatus != RosbagReviewStatus.Approved)
				throw new InvalidOperationException("Rosbag chưa được duyệt. Chỉ phân tích file đã được Engineer/Admin chấp nhận.");
		}

		public virtual ICollection<AnalysisSession> AnalysisSessions { get; set; } = new HashSet<AnalysisSession>();
	}
}
