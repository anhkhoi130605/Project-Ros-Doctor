using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Domain.Entities.Config;
using Domain.Entities.AboutUser;
using Domain.Entities.System;
using Infrastructure.Persistence;
using Application.Interfaces.ManageTrancsaction;

namespace Infrastructure.Repository
{
	internal sealed class EfTransactionWrapper : IApplicationTransaction
	{
		private readonly IDbContextTransaction _transaction;

		public EfTransactionWrapper(IDbContextTransaction transaction)
		{
			_transaction = transaction ?? throw new ArgumentNullException(nameof(transaction));
		}

		public Task CommitAsync(CancellationToken cancellationToken = default)
		{
			return _transaction.CommitAsync(cancellationToken);
		}

		public Task RollbackAsync(CancellationToken cancellationToken = default)
		{
			return _transaction.RollbackAsync(cancellationToken);
		}

		public ValueTask DisposeAsync()
		{
			return _transaction.DisposeAsync();
		}

		public void Dispose()
		{
			_transaction.Dispose();
		}
	}

	public class UnitOfWork : IUnitOfWork, IDisposable
	{
		private readonly AppDbContext _ctx;

		public IUserRepository User { get; }
		public IGenericRepository<Role> Roles { get; }
		public IGenericRepository<Notification> Notifications { get; }
		public IGenericRepository<UserActivityLog> UserActivityLogs { get; }
		public IGenericRepository<SystemErrorLog> SystemErrorLogs { get; }
		public IGenericRepository<AccountPolicy> AccountPolicies { get; }

		public UnitOfWork(AppDbContext ctx, IUserRepository userRepository)
		{
			_ctx = ctx ?? throw new ArgumentNullException(nameof(ctx));
			User = userRepository ?? (IUserRepository)new UserRepository(_ctx);

			// Initialize generic repositories
			Roles = new GenericRepository<Role>(_ctx);
			Notifications = new GenericRepository<Notification>(_ctx);
			UserActivityLogs = new GenericRepository<UserActivityLog>(_ctx);
			SystemErrorLogs = new GenericRepository<SystemErrorLog>(_ctx);
			AccountPolicies = new GenericRepository<AccountPolicy>(_ctx);
		}

		public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
		{
			return _ctx.SaveChangesAsync(cancellationToken);
		}

		public async Task<IApplicationTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
		{
			var tx = await _ctx.Database.BeginTransactionAsync(cancellationToken);
			return new EfTransactionWrapper(tx);
		}

		public async Task<IApplicationTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default)
		{
			var tx = await _ctx.Database.BeginTransactionAsync(isolationLevel, cancellationToken);
			return new EfTransactionWrapper(tx);
		}

		public void Dispose()
		{
			_ctx?.Dispose();
		}
	}
}
