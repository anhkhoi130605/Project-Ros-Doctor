using System;
using System.Collections.Generic;
using Domain.Entities.Config;
using Domain.Enums;
using static Domain.Enums.UserEnum;
namespace Domain.Entities.AboutUser;

public partial class User : BaseEntity
{
	public string? UserName { get; set; }

	public string Email { get; set; } = null!;

	public string FullName { get; set; } = null!;

	public string? PasswordHash { get; set; }

	public string? Phone { get; set; }

	public string? AvatarUrl { get; set; }

	public string RoleId { get; set; } = null!;

	public UserStatusEnum? Status { get; set; }

	public bool? IsBanned { get; set; } = false;
	public string? Bio { get; set; }

	public DateTime? ReactivateAt { get; set; }

	public string? GoogleId { get; set; }

    public virtual Role Role { get; set; } = null!;

	public Gender? Gender { get; set; }

	public DateTime? DateOfBirth { get; set; }
	public virtual ICollection<AccountPolicy> AccountPolicies { get; set; } = new HashSet<AccountPolicy>();
}
