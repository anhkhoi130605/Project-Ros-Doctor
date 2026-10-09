using System;
using System.Collections.Generic;
using MediatR;

namespace Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser
{
	public class MemberDto
	{
		public string Id { get; set; } = string.Empty;
		public string FullName { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string Role { get; set; } = "User";
		public string Status { get; set; } = "Offline";
        public string AccountStatus { get; set; } = "Active";
		public string? AvatarUrl { get; set; }
		public string? Phone { get; set; }
		public DateTime? LastActiveAt { get; set; }
		public string? LastAction { get; set; }
		public DateTime? CreatedAt { get; set; }
	}

	public record GetMembersQuery() : IRequest<List<MemberDto>>;
}
