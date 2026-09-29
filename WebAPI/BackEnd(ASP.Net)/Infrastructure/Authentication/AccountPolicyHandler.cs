using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Application.Interfaces.ManageForRole;

namespace Infrastructure.Authentication
{
	/// <summary>
	/// Xử lý phân quyền theo Clean Architecture:
	/// Ủy quyền việc xác thực quyền hạn cho Application Service (IAccountPolicyService).
	/// </summary>
	public class AccountPolicyHandler : AuthorizationHandler<AccountPolicyRequirement>
	{
		private readonly IAccountPolicyService _policyService;

		public AccountPolicyHandler(IAccountPolicyService policyService)
		{
			_policyService = policyService ?? throw new ArgumentNullException(nameof(policyService));
		}

		protected override async Task HandleRequirementAsync(
			AuthorizationHandlerContext context,
			AccountPolicyRequirement requirement)
		{
			var user = context.User;
			if (user?.Identity == null || !user.Identity.IsAuthenticated)
			{
				return;
			}

			var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)
				?? user.FindFirstValue("sub")
				?? user.FindFirstValue(ClaimTypes.Name);

			if (string.IsNullOrEmpty(userId))
			{
				return;
			}

			var hasPolicy = await _policyService.HasPolicyAsync(userId, requirement.PolicyName);
			if (hasPolicy)
			{
				context.Succeed(requirement);
			}
		}
	}
}
