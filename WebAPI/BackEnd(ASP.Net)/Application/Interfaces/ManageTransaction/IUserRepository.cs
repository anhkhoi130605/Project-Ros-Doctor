using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities.Identity;

namespace Application.Interfaces.ManageTransaction
{
	public interface IUserRepository : IGenericRepository<User>
	{
		Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);
		Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
	}
}
