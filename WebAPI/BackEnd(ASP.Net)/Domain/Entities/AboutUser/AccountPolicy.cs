using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Config;

namespace Domain.Entities.AboutUser
{
	public class AccountPolicy : BaseEntity
	{
		[Required]
		[Column("user_id")]
		public string UserId { get; set; } = null!;

		[ForeignKey(nameof(UserId))]
		public virtual User User { get; set; } = null!;

		[Required]
		[MaxLength(100)]
		[Column("policy_name")]
		public string PolicyName { get; set; } = null!;

		[Required]
		[Column("policy_rule")]
		public string PolicyRule { get; set; } = null!;
	}
}
