using Microsoft.AspNetCore.Authorization;

namespace Infrastructure.Authentication
{
	public class AccountPolicyRequirement : IAuthorizationRequirement
	{
		public string PolicyName { get; }

		public AccountPolicyRequirement(string policyName)
		{
			PolicyName = policyName;
		}
	}
}
