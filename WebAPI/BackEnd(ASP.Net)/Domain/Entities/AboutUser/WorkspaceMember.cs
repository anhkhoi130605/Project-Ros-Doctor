using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.Config;

namespace Domain.Entities.AboutUser
{
	[Table("members")]
	public class WorkspaceMember : BaseEntity
	{
		[Required]
		[Column("workspace_id")]
		public string WorkspaceId { get; set; } = null!;

		[ForeignKey(nameof(WorkspaceId))]
		public virtual Workspace Workspace { get; set; } = null!;

		[Required]
		[Column("user_id")]
		public string UserId { get; set; } = null!;

		[ForeignKey(nameof(UserId))]
		public virtual User User { get; set; } = null!;

		[Required]
		[Column("role_id")]
		public string RoleId { get; set; } = null!;

		[ForeignKey(nameof(RoleId))]
		public virtual Role Role { get; set; } = null!;
	}
}
