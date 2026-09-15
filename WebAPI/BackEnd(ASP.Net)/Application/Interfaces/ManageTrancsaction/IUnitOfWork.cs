using System.Collections.Generic;
using System.Data;
using Microsoft.EntityFrameworkCore.Storage;
using Domain.Entities.Config;
using Domain.Entities.AboutUser;

namespace Application.Interfaces.ManageTrancsaction
{
    public interface IUnitOfWork : IDisposable
	{
		Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
		Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
		Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default);
        IUserRepository User { get; }
		IGenericRepository<Role> Roles { get; }
		IGenericRepository<Notification> Notifications { get; }
	}
}

