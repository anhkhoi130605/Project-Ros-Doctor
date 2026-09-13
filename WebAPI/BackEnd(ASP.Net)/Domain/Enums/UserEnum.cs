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
		public enum MemberInOrOutClubEnum
		{
			InClub,
			OutClub
		}
		public enum Gender
		{
			Male,
			Female
		}
		public enum StudentCodeEnum
		{
		  DE,
		  DS
		}
		public enum RoleInClublEnum{
		    President,
			VicePresident,
			Member,
			Leader
		}
		public enum RoleOutClubEnum
		{
		   Student,
		   Teacher
		}
		public enum RoleSupportClubEnum
		{
			Mentor,
			Manager
		}
	}
}
