using System;
using System.Collections.Generic;
using System.Data;
using Domain.Entities.Config;
using Domain.Entities.Information;
using Domain.Enums;
using static Domain.Enums.UserEnum;
namespace Domain.Entities.AboutUser;

public partial class User : BaseEntity
{
	//public string Id { get; set; } = null!;

	public string Email { get; set; } = null!;

	public string FullName { get; set; } = null!;

	public string? PasswordHash { get; set; }

	public string? Phone { get; set; }

	public string? AvatarUrl { get; set; }

	public string RoleId { get; set; } = null!;

	public UserStatusEnum? Status { get; set; }

	public bool? IsBanned { get; set; }
	public string? Bio{ get; set; }

	public DateTime? ReactivateAt { get; set; }

	public string? GoogleId { get; set; }

	//public DateTime? CreatedAt { get; set; }

	//public DateTime? UpdatedAt { get; set; }

	//public DateTime? DeletedAt { get; set; }

	public virtual ProfileUser? Profile { get; set; }

	// Backwards-compatible navigation name expected by existing EF migrations/snapshots.
	// Some migrations/configurations reference `StudentProfile` as the inverse navigation
	// for `Profile` entity. Keep `Profile` as the primary property but expose
	// `StudentProfile` as an alias so EF won't create a shadow navigation and cause
	// duplicate navigation errors at design time.
	public virtual ProfileUser? StudentProfile
	{
		get => Profile;
		set => Profile = value;
	}

	public virtual ICollection<Notification> Notifications { get; set; } = new HashSet<Notification>();

    public virtual Role Role { get; set; } = null!;
	// Store full student id like DE123456 as string
	public string StudentId { get; set; } = string.Empty;

	public Gender? Gender { get; set; }

	public MemberInOrOutClubEnum MemberInOrOutClub { get; set; }
	public DateTime? DateOfBirth { get; set; }
}
