using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Domain.Entities.Config;
using Domain.Entities.EventIformation;
using Domain.Entities.FeedBack;
using Domain.Entities.Information;
using Domain.Entities.RoomIformation;
using Domain.Entities.AboutUser;
using Infrastructure.Persistence;
using Application.Interfaces.ManageTrancsaction;

namespace Infrastructure.Repository
{
	public class UnitOfWork : IUnitOfWork, IDisposable
	{
		private readonly AppDbContext _ctx;

		public IUserRepository User { get; }
		public IGenericRepository<ProfileUser> Profile { get; }
		public IGenericRepository<Role> Roles { get; }
		public IGenericRepository<Notification> Notifications { get; }
		public IGenericRepository<Department> Departments { get; }
		public IGenericRepository<EventWaitlist> EventWaitlists { get; }
		public IGenericRepository<Feedback> Feedbacks { get; }
		public IGenericRepository<StudentQuizScore> StudentQuizScores { get; }
		public IGenericRepository<TeamMember> TeamMembers { get; }
		public IGenericRepository<EventAgenda> EventAgendas { get; }
		public IGenericRepository<Ticket> Tickets { get; }

		public UnitOfWork(AppDbContext ctx, IUserRepository userRepository)
		{
			_ctx = ctx ?? throw new ArgumentNullException(nameof(ctx));
			User = userRepository ?? (IUserRepository)new UserRepository(_ctx);

			// Initialize generic repositories
			Profile = new GenericRepository<ProfileUser>(_ctx);
			Roles = new GenericRepository<Role>(_ctx);
			Notifications = new GenericRepository<Notification>(_ctx);
			Departments = new GenericRepository<Department>(_ctx);
			EventWaitlists = new GenericRepository<EventWaitlist>(_ctx);
			Feedbacks = new GenericRepository<Feedback>(_ctx);
			StudentQuizScores = new GenericRepository<StudentQuizScore>(_ctx);
			TeamMembers = new GenericRepository<TeamMember>(_ctx);
			EventAgendas = new GenericRepository<EventAgenda>(_ctx);
			Tickets = new GenericRepository<Ticket>(_ctx);
		}

		public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
		{
			return _ctx.SaveChangesAsync(cancellationToken);
		}

		public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
		{
			return _ctx.Database.BeginTransactionAsync(cancellationToken);
		}

		public Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default)
		{
			return _ctx.Database.BeginTransactionAsync(isolationLevel,cancellationToken);
		}

		public void Dispose()
		{
			_ctx?.Dispose();
		}
	}
}
