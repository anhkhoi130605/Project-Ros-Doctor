using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Enums
{
	public class UserEnum
	{
		public enum UserStatusEnum
		{
			Active,
			Inactive,
			Banned,
			PendingApproval
		}
		public enum RoleEnum
		{
			User,
			Admin,

			Engineering,
		}
		public enum Gender
		{
			Male,
			Female,
			Other
		}
	}
}
