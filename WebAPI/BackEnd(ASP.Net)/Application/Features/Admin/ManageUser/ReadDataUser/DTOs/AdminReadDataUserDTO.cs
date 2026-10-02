using System;
using System.Collections.Generic;
using Domain.Entities.Identity;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.ReadDataUser.DTOs
{
	public record AdminReadDataUserDTO
	{
		public required string Email { get; init; }
		public required string FullName { get; init; }
		public string? Phone { get; init; }
		public UserStatusEnum? Status { get; init; }
		public Gender? Gender { get; init; }
		public virtual Role? Role { get; init; }
		public string? Bio { get; init; }
	}
}
