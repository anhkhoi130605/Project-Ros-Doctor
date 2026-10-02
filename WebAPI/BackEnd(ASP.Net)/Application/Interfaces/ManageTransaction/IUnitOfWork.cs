using System.Collections.Generic;
using System.Data;
using Domain.Common;
using Domain.Entities.Identity;
using Domain.Entities.System;
using Domain.Entities.Notifications;

namespace Application.Interfaces.ManageTransaction
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
		IGenericRepository<Workspace> Workspaces { get; }
		IGenericRepository<WorkspaceMember> WorkspaceMembers { get; }

		// Nhóm Cấu hình hệ thống & AI
		IGenericRepository<Domain.Entities.Configuration.AiSetting> AiSettings { get; }
		IGenericRepository<Domain.Entities.Configuration.AnalysisConfig> AnalysisConfigs { get; }
		IGenericRepository<Domain.Entities.Configuration.SystemThresholdConfig> SystemThresholdConfigs { get; }
		IGenericRepository<Domain.Entities.Configuration.TopicThresholdRule> TopicThresholdRules { get; }

		// Nhóm Rosbag, Phân tích & Báo cáo
		IGenericRepository<Domain.Entities.RosbagAnalysis.Rosbag> Rosbags { get; }
		IGenericRepository<Domain.Entities.RosbagAnalysis.AnalysisSession> AnalysisSessions { get; }
		IGenericRepository<Domain.Entities.RosbagAnalysis.DiagnosticIssue> DiagnosticIssues { get; }
		IGenericRepository<Domain.Entities.RosbagAnalysis.ReviewAuditLog> ReviewAuditLogs { get; }
		IGenericRepository<Domain.Entities.RosbagAnalysis.Report> Reports { get; }
		IGenericRepository<Domain.Entities.RosbagAnalysis.AiUsageLog> AiUsageLogs { get; }
	}
}

