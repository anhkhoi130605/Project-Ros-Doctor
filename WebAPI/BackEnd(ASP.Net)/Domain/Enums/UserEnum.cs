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
			Banned
		}
		public enum RoleEnum
		{
			User,
			Admin
		}
		public enum Gender
		{
			Male,
			Female,
			Other
		}
	}
}
