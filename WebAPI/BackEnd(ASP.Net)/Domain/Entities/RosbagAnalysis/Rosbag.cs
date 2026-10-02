using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Identity;
using Domain.Entities.Config;
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

		public virtual ICollection<AnalysisSession> AnalysisSessions { get; set; } = new HashSet<AnalysisSession>();
	}
}
