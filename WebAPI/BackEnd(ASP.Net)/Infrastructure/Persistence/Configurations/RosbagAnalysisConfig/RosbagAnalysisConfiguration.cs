using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.RosbagAnalysis;

namespace Infrastructure.Persistence.Configurations.RosbagAnalysisConfig
{
	public class RosbagConfiguration : IEntityTypeConfiguration<Rosbag>
	{
		public void Configure(EntityTypeBuilder<Rosbag> builder)
		{
			builder.ToTable("rosbags");

			builder.Property(x => x.UserId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.FileName).IsRequired().HasMaxLength(255);
			builder.Property(x => x.SizeBytes).IsRequired();
			builder.Property(x => x.DurationSec).IsRequired();
			builder.Property(x => x.TopicCount).HasDefaultValue(0);
			builder.Property(x => x.IsPublished).HasDefaultValue(false);

			builder.Property(x => x.Format)
				.HasConversion<string>()
				.HasMaxLength(20)
				.IsRequired();

			builder.Property(x => x.Status)
				.HasConversion<string>()
				.HasMaxLength(30)
				.IsRequired();

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Restrict);

			builder.HasIndex(x => x.CreatedAt);
			builder.HasIndex(x => x.UserId);
			builder.HasIndex(x => x.Status);
		}
	}

	public class AnalysisSessionConfiguration : IEntityTypeConfiguration<AnalysisSession>
	{
		public void Configure(EntityTypeBuilder<AnalysisSession> builder)
		{
			builder.ToTable("analysis_sessions");

			builder.Property(x => x.RosbagId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.HealthScore).HasDefaultValue(100);
			builder.Property(x => x.ExecutionTimeSec).HasDefaultValue(0);

			builder.Property(x => x.ResultCode)
				.HasConversion<string>()
				.HasMaxLength(50);

			builder.Property(x => x.Status)
				.HasConversion<string>()
				.HasMaxLength(50)
				.IsRequired();

			builder.HasOne(x => x.Rosbag)
				.WithMany(r => r.AnalysisSessions)
				.HasForeignKey(x => x.RosbagId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasOne(x => x.Report)
				.WithOne(r => r.Session)
				.HasForeignKey<Report>(r => r.SessionId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasIndex(x => x.RosbagId);
			builder.HasIndex(x => x.StartedAt);
			builder.HasIndex(x => x.EngineerId);
		}
	}

	public class DiagnosticIssueConfiguration : IEntityTypeConfiguration<DiagnosticIssue>
	{
		public void Configure(EntityTypeBuilder<DiagnosticIssue> builder)
		{
			builder.ToTable("diagnostic_issues");

			builder.Property(x => x.SessionId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.Topic).HasMaxLength(100);
			builder.Property(x => x.TimeRange).HasMaxLength(50);
			builder.Property(x => x.IssueTitle).IsRequired().HasMaxLength(255);

			builder.Property(x => x.Severity)
				.HasConversion<string>()
				.HasMaxLength(20)
				.IsRequired();

			builder.HasOne(x => x.Session)
				.WithMany(s => s.DiagnosticIssues)
				.HasForeignKey(x => x.SessionId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasIndex(x => x.SessionId);
			builder.HasIndex(x => new { x.SessionId, x.Severity });
			builder.HasIndex(x => x.CreatedAt);
		}
	}

	public class ReportConfiguration : IEntityTypeConfiguration<Report>
	{
		public void Configure(EntityTypeBuilder<Report> builder)
		{
			builder.ToTable("reports");

			builder.Property(x => x.SessionId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.ReviewerId).HasMaxLength(36);
			builder.Property(x => x.Title).IsRequired().HasMaxLength(255);
			builder.Property(x => x.ApprovedConclusionCount).HasDefaultValue(0);

			builder.Property(x => x.Status)
				.HasConversion<string>()
				.HasMaxLength(30)
				.IsRequired();

			builder.HasIndex(x => x.SessionId).IsUnique();
			builder.HasIndex(x => x.CreatedAt);
			builder.HasIndex(x => x.Status);

			builder.HasOne(x => x.Reviewer)
				.WithMany()
				.HasForeignKey(x => x.ReviewerId)
				.OnDelete(DeleteBehavior.SetNull);
		}
	}

	public class AiUsageLogConfiguration : IEntityTypeConfiguration<AiUsageLog>
	{
		public void Configure(EntityTypeBuilder<AiUsageLog> builder)
		{
			builder.ToTable("llm_usage_ledger");

			builder.Property(x => x.SessionId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.ModelName).IsRequired().HasMaxLength(50);
			builder.Property(x => x.PromptTokens).IsRequired();
			builder.Property(x => x.CompletionTokens).IsRequired();
			builder.Property(x => x.CostUsd).HasPrecision(10, 4).IsRequired();
			builder.Property(x => x.LatencyMs).IsRequired();

			builder.HasOne(x => x.Session)
				.WithMany(s => s.AiUsageLogs)
				.HasForeignKey(x => x.SessionId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasIndex(x => x.SessionId);
			builder.HasIndex(x => x.CreatedAt);
		}
	}

	public class ReviewAuditLogConfiguration : IEntityTypeConfiguration<ReviewAuditLog>
	{
		public void Configure(EntityTypeBuilder<ReviewAuditLog> builder)
		{
			builder.ToTable("review_audit_logs");

			builder.Property(x => x.FindingId).IsRequired();
			builder.Property(x => x.ReviewerId).IsRequired();
			builder.Property(x => x.ReviewNote).HasMaxLength(1000);

			builder.Property(x => x.Decision)
				.HasConversion<string>()
				.HasMaxLength(30)
				.IsRequired();

			builder.HasOne(x => x.Finding)
				.WithMany(f => f.ReviewAuditLogs)
				.HasForeignKey(x => x.FindingId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasOne(x => x.Reviewer)
				.WithMany()
				.HasForeignKey(x => x.ReviewerId)
				.OnDelete(DeleteBehavior.Restrict);

			builder.HasIndex(x => x.FindingId);
			builder.HasIndex(x => x.ReviewedAt);
			builder.HasIndex(x => x.CreatedAt);
		}
	}
}
