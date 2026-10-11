using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Common;

namespace Domain.Entities.Configuration
{
	public class TopicThresholdRule : BaseEntity
	{
		[ForeignKey(nameof(SystemThresholdConfig))]
		public virtual SystemThresholdConfig SystemThresholdConfig { get; set; } = null!;

		[Required]
		[MaxLength(100)]
		[Column("topic_name")]
		public string TopicName { get; set; } = null!;

		[Column("expected_hz")]
		public float ExpectedHz { get; set; }
	}
}
