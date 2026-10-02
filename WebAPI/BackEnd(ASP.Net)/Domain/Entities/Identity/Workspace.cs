using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Common;

namespace Domain.Entities.Identity
{
	[Table("workspaces")]
	public class Workspace : BaseEntity
	{
		[Required]
		[MaxLength(100)]
		[Column("name")]
		public string Name { get; set; } = null!;

		[MaxLength(255)]
		[Column("description")]
		public string? Description { get; set; }

		[Required]
		[Column("owner_id")]
		public string OwnerId { get; set; } = null!;

		[ForeignKey(nameof(OwnerId))]
		public virtual User Owner { get; set; } = null!;

		public virtual ICollection<WorkspaceMember> Members { get; set; } = new HashSet<WorkspaceMember>();
	}
}
