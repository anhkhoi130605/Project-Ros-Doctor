using System;
using System.Collections.Generic;
using System.Text;
using Domain.Entities.AboutUser;

namespace Application.Interfaces.ManageTrancsaction
{
	public interface IUserRepository : IGenericRepository<User>
	{
		Task<User?> FindByEmailAsync(string email);
		Task<bool> ExistsByEmailAsync(string email);
		Task<bool> ExistsStudentIdAsync(string studentId);
	}
}
