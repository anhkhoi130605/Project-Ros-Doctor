using System.Security.Claims;

namespace API.Middlewares.Extentions
{
	public static class ClaimsExtensions
	{
		public static string? GetUserId(this ClaimsPrincipal user)
		{
			return user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
		}

		public static string? GetRole(this ClaimsPrincipal user)
		{
			return user.FindFirst(ClaimTypes.Role)?.Value;
		}
	}
}
