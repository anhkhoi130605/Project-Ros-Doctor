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
		public IGenericRepository<Workspace> Workspaces { get; }
		public IGenericRepository<WorkspaceMember> WorkspaceMembers { get; }

		// Nhóm Cấu hình hệ thống & AI
		public IGenericRepository<Domain.Entities.Configuration.AiSetting> AiSettings { get; }
		public IGenericRepository<Domain.Entities.Configuration.AnalysisConfig> AnalysisConfigs { get; }
		public IGenericRepository<Domain.Entities.Configuration.SystemThresholdConfig> SystemThresholdConfigs { get; }
		public IGenericRepository<Domain.Entities.Configuration.TopicThresholdRule> TopicThresholdRules { get; }

		// Nhóm Rosbag, Phân tích & Báo cáo
		public IGenericRepository<Domain.Entities.RosbagAnalysis.Rosbag> Rosbags { get; }
		public IGenericRepository<Domain.Entities.RosbagAnalysis.AnalysisSession> AnalysisSessions { get; }
		public IGenericRepository<Domain.Entities.RosbagAnalysis.DiagnosticIssue> DiagnosticIssues { get; }
		public IGenericRepository<Domain.Entities.RosbagAnalysis.ReviewAuditLog> ReviewAuditLogs { get; }
		public IGenericRepository<Domain.Entities.RosbagAnalysis.Report> Reports { get; }
		public IGenericRepository<Domain.Entities.RosbagAnalysis.AiUsageLog> AiUsageLogs { get; }

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
			Workspaces = new GenericRepository<Workspace>(_ctx);
			WorkspaceMembers = new GenericRepository<WorkspaceMember>(_ctx);

			AiSettings = new GenericRepository<Domain.Entities.Configuration.AiSetting>(_ctx);
			AnalysisConfigs = new GenericRepository<Domain.Entities.Configuration.AnalysisConfig>(_ctx);
			SystemThresholdConfigs = new GenericRepository<Domain.Entities.Configuration.SystemThresholdConfig>(_ctx);
			TopicThresholdRules = new GenericRepository<Domain.Entities.Configuration.TopicThresholdRule>(_ctx);

			Rosbags = new GenericRepository<Domain.Entities.RosbagAnalysis.Rosbag>(_ctx);
			AnalysisSessions = new GenericRepository<Domain.Entities.RosbagAnalysis.AnalysisSession>(_ctx);
			DiagnosticIssues = new GenericRepository<Domain.Entities.RosbagAnalysis.DiagnosticIssue>(_ctx);
			ReviewAuditLogs = new GenericRepository<Domain.Entities.RosbagAnalysis.ReviewAuditLog>(_ctx);
			Reports = new GenericRepository<Domain.Entities.RosbagAnalysis.Report>(_ctx);
			AiUsageLogs = new GenericRepository<Domain.Entities.RosbagAnalysis.AiUsageLog>(_ctx);
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
