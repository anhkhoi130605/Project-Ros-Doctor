using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.AboutUser;

namespace Application.Interfaces.ManageForRole.Admin
{
	public interface IAdmin
	{
		Task<User> GetUserByIdAsync(string userId);
	}
}
