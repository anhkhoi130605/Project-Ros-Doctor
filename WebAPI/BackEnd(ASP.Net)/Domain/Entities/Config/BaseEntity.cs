using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;
using Domain.Helper;

namespace Domain.Entities.Config
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
			var vietnamTime = DateTimeHelper.GetVietnamTime();
			CreatedAt = vietnamTime;
			UpdatedAt = vietnamTime;
		}
	}
}
