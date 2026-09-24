using Domain.Entities.System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.SystemConfiguration
{
    public class SystemErrorLogConfiguration : IEntityTypeConfiguration<SystemErrorLog>
    {
        public void Configure(EntityTypeBuilder<SystemErrorLog> builder)
        {
            builder.ToTable("SystemErrorLogs");

            builder.Property(x => x.LogLevel).IsRequired().HasMaxLength(50);
            builder.Property(x => x.ExceptionType).IsRequired().HasMaxLength(250);
            builder.Property(x => x.ErrorMessage).IsRequired().HasMaxLength(2000);
            builder.Property(x => x.TranslatedMessage).IsRequired().HasMaxLength(2000);
            builder.Property(x => x.StackTrace).HasColumnType("text");
            builder.Property(x => x.RequestPath).HasMaxLength(500);
            builder.Property(x => x.HttpMethod).HasMaxLength(20);
            builder.Property(x => x.UserId).HasMaxLength(100);
            builder.Property(x => x.IpAddress).HasMaxLength(50);
            builder.Property(x => x.UserAgent).HasMaxLength(500);

            builder.HasIndex(x => x.CreatedAt);
            builder.HasIndex(x => x.ExceptionType);
            builder.HasIndex(x => x.LogLevel);
        }
    }
}
