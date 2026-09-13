using System.Collections.Generic;
using System.Data;
using Microsoft.EntityFrameworkCore.Storage;
using Domain.Entities.Config;
using Domain.Entities.EventIformation;
using Domain.Entities.FeedBack;
using Domain.Entities.Information;
using Domain.Entities.RoomIformation;
using Domain.Entities.AboutUser;
using Domain.Entities.Config;

namespace Application.Interfaces.ManageTrancsaction
{
    public interface IUnitOfWork : IDisposable
	{
		Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
		Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
		Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default);
        IUserRepository User { get; }
		IGenericRepository<ProfileUser> Profile { get; }
		IGenericRepository<Role> Roles { get; }
		IGenericRepository<Notification> Notifications { get; }
		IGenericRepository<Department> Departments { get; }
		IGenericRepository<EventWaitlist> EventWaitlists { get; }
		IGenericRepository<Feedback> Feedbacks { get; }
		IGenericRepository<StudentQuizScore> StudentQuizScores { get; }
		IGenericRepository<TeamMember> TeamMembers { get; }
		IGenericRepository<EventAgenda> EventAgendas { get; }
		IGenericRepository<Ticket> Tickets { get; }
	}
}

