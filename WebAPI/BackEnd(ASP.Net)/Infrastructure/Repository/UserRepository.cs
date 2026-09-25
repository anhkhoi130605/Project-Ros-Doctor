using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Domain.Entities.AboutUser;
using Infrastructure.Persistence;
using Application.Interfaces.ManageTrancsaction;

namespace Infrastructure.Repository;

public class UserRepository : GenericRepository<User>, IUserRepository
{
	public UserRepository(AppDbContext context) : base(context)
	{
	}

	public async Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
	{
		return await _context.Set<User>()
			.Include(x => x.Role)
			.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
	}

	public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
	{
		return await _context.Set<User>().AnyAsync(x => x.Email == email, cancellationToken);
	}
}
