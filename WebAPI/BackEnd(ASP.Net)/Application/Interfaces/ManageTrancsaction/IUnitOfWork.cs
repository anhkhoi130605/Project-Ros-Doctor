using System.Collections.Generic;
using System.Data;
using Domain.Entities.Config;
using Domain.Entities.AboutUser;
using Domain.Entities.System;

namespace Application.Interfaces.ManageTrancsaction
{
    public interface IUnitOfWork : IDisposable
	{
		Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
		Task<IApplicationTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
		Task<IApplicationTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default);
        IUserRepository User { get; }
		IGenericRepository<Role> Roles { get; }
		IGenericRepository<Notification> Notifications { get; }
		IGenericRepository<UserActivityLog> UserActivityLogs { get; }
		IGenericRepository<SystemErrorLog> SystemErrorLogs { get; }
		IGenericRepository<AccountPolicy> AccountPolicies { get; }
	}
}

