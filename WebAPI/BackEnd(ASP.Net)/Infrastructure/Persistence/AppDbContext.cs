using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Domain.Entities.AboutUser;
using Domain.Entities.System;

namespace Infrastructure.Persistence;

public partial class AppDbContext : DbContext
{
    private readonly IConfiguration? _configuration;

    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Constructor used when resolving IConfiguration from DI
    public AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration)
        : base(options)
    {
        _configuration = configuration;
    }

    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<Role> Roles { get; set; }
	public virtual DbSet<UserActivityLog> UserActivityLogs { get; set; }
	public virtual DbSet<SystemErrorLog> SystemErrorLogs { get; set; }
	public virtual DbSet<AccountPolicy> AccountPolicies { get; set; }
	public virtual DbSet<Workspace> Workspaces { get; set; }
	public virtual DbSet<WorkspaceMember> WorkspaceMembers { get; set; }

	// Nhóm Cấu hình hệ thống & AI
	public virtual DbSet<Domain.Entities.Configuration.AiSetting> AiSettings { get; set; }
	public virtual DbSet<Domain.Entities.Configuration.AnalysisConfig> AnalysisConfigs { get; set; }
	public virtual DbSet<Domain.Entities.Configuration.SystemThresholdConfig> SystemThresholdConfigs { get; set; }
	public virtual DbSet<Domain.Entities.Configuration.TopicThresholdRule> TopicThresholdRules { get; set; }

	// Nhóm Rosbag, Phân tích & Báo cáo
	public virtual DbSet<Domain.Entities.RosbagAnalysis.Rosbag> Rosbags { get; set; }
	public virtual DbSet<Domain.Entities.RosbagAnalysis.AnalysisSession> AnalysisSessions { get; set; }
	public virtual DbSet<Domain.Entities.RosbagAnalysis.DiagnosticIssue> DiagnosticIssues { get; set; }
	public virtual DbSet<Domain.Entities.RosbagAnalysis.ReviewAuditLog> ReviewAuditLogs { get; set; }
	public virtual DbSet<Domain.Entities.RosbagAnalysis.Report> Reports { get; set; }
	public virtual DbSet<Domain.Entities.RosbagAnalysis.AiUsageLog> AiUsageLogs { get; set; }

	protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Try to get connection string from injected IConfiguration
            var connectionString = _configuration?.GetConnectionString("DefaultConnection");

            // Fallback to environment variable
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            }

            // Fallback to reading appsettings.json manually (no extra packages required)
            if (string.IsNullOrEmpty(connectionString))
            {
                try
                {
                    var path = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                            connSection.TryGetProperty("DefaultConnection", out var defaultConn))
                        {
                            connectionString = defaultConn.GetString();
                        }
                    }
                }
                catch
                {
                    // ignore parsing errors and fall through
                }
            }

            if (!string.IsNullOrEmpty(connectionString))
            {
                optionsBuilder.UseMySql(connectionString, Microsoft.EntityFrameworkCore.ServerVersion.Parse("8.4.8-mysql"));
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.UserConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.RoleConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.WorkspaceConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.WorkspaceMemberConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.UserActivityLogConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.AccountPolicyConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.SystemConfiguration.SystemErrorLogConfiguration());

        // Cấu hình nhóm Settings & AI
        modelBuilder.ApplyConfiguration(new Configurations.ConfigurationConfig.AiSettingConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ConfigurationConfig.AnalysisConfigConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ConfigurationConfig.SystemThresholdConfigConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ConfigurationConfig.TopicThresholdRuleConfiguration());

        // Cấu hình nhóm Rosbag, Phân tích & Báo cáo
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.RosbagConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.AnalysisSessionConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.DiagnosticIssueConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.ReviewAuditLogConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.ReportConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.RosbagAnalysisConfig.AiUsageLogConfiguration());
       
		OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
