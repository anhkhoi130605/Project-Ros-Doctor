namespace Application.Features.UserProfile.DTOs
{
	public class UserProfileDto
	{
		public string Id { get; set; } = string.Empty;
		public string? UserName { get; set; }
		public string Email { get; set; } = string.Empty;
		public string FullName { get; set; } = string.Empty;
		public string? Phone { get; set; }
		public string? AvatarUrl { get; set; }
		public string? Bio { get; set; }
		public string? Role { get; set; }
		public string? Status { get; set; }
	}

	public class UpdateProfileRequestDto
	{
		public string FullName { get; set; } = string.Empty;
		public string? Phone { get; set; }
		public string? Bio { get; set; }
	}
}
