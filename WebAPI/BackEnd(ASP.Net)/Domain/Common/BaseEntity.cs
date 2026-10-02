using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Common
{
	public abstract class BaseEntity
	{
		[Key]
		[DatabaseGenerated(DatabaseGeneratedOption.None)]
		public string Id { get; set; }

		public DateTime CreatedAt { get; set; }

		public DateTime UpdatedAt { get; set; }

		public DateTime? DeletedAt { get; set; } = null;

		public string? CreatedBy { get; set; }

		public string? UpdatedBy { get; set; }

		[Timestamp]
		public byte[] RowVersion { get; set; } = Array.Empty<byte>();

		protected BaseEntity()
		{
			Id = Guid.NewGuid().ToString();
			CreatedAt = DateTime.UtcNow;
			UpdatedAt = DateTime.UtcNow;
		}
	}
}
