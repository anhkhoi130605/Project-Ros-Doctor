using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.Configuration;

namespace Infrastructure.Persistence.Configurations.ConfigurationConfig
{
	public class AiSettingConfiguration : IEntityTypeConfiguration<AiSetting>
	{
		public void Configure(EntityTypeBuilder<AiSetting> builder)
		{
			builder.ToTable("ai_settings");

			builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired().HasMaxLength(36);
			builder.Property(x => x.VectorDbUrl).HasMaxLength(255).HasDefaultValue("http://localhost:8333");
			builder.Property(x => x.DailyCallLimit).HasDefaultValue(100);
			builder.Property(x => x.RateLimitPerMin).HasDefaultValue(10);
			builder.Property(x => x.MaxTokensPerCall).HasDefaultValue(4000);
			builder.Property(x => x.MonthlyBudgetUsd).HasPrecision(10, 2).HasDefaultValue(25.00m);

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		}
	}

	public class AnalysisConfigConfiguration : IEntityTypeConfiguration<AnalysisConfig>
	{
		public void Configure(EntityTypeBuilder<AnalysisConfig> builder)
		{
			builder.ToTable("analysis_configs");

			builder.Property(x => x.UserId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.FreqToleranceHz).HasDefaultValue(0.5f);
			builder.Property(x => x.MaxLatencyMs).HasDefaultValue(500);
			builder.Property(x => x.PacketDropPercent).HasDefaultValue(5.0f);
			builder.Property(x => x.MemoryLimitMb).HasDefaultValue(2048);
			builder.Property(x => x.AutoDiagnose).HasDefaultValue(true);
			builder.Property(x => x.StrictEvidence).HasDefaultValue(true);
			builder.Property(x => x.HighSeverityAlert).HasDefaultValue(true);

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		}
	}

	public class SystemThresholdConfigConfiguration : IEntityTypeConfiguration<SystemThresholdConfig>
	{
		public void Configure(EntityTypeBuilder<SystemThresholdConfig> builder)
		{
			builder.ToTable("system_threshold_configs");

			builder.Property(x => x.UserId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.ProfileName).IsRequired().HasMaxLength(100);
			builder.Property(x => x.CalcWindowSec).HasDefaultValue(10);
			builder.Property(x => x.TopicTimeoutSec).HasDefaultValue(3);
			builder.Property(x => x.ClockOffsetMs).HasDefaultValue(30);
			builder.Property(x => x.TfLatencyMs).HasDefaultValue(50);
			builder.Property(x => x.SendStatsOnly).HasDefaultValue(false);
			builder.Property(x => x.RedactGps).HasDefaultValue(true);
			builder.Property(x => x.AuditTrail).HasDefaultValue(true);

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		}
	}

	public class TopicThresholdRuleConfiguration : IEntityTypeConfiguration<TopicThresholdRule>
	{
		public void Configure(EntityTypeBuilder<TopicThresholdRule> builder)
		{
			builder.ToTable("topic_threshold_rules");

			builder.Property(x => x.ThresholdConfigId).IsRequired().HasMaxLength(36);
			builder.Property(x => x.TopicName).IsRequired().HasMaxLength(100);
			builder.Property(x => x.ExpectedHz).IsRequired();

			builder.HasOne(x => x.SystemThresholdConfig)
				.WithMany(c => c.TopicThresholdRules)
				.HasForeignKey(x => x.ThresholdConfigId)
				.OnDelete(DeleteBehavior.Cascade);
		}
	}
}
