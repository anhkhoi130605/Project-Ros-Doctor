using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.Identity;
using static Domain.Enums.UserEnum;

namespace Infrastructure.Persistence.Configurations.UserConfiguration
{
	public class UserConfiguration : IEntityTypeConfiguration<User>
	{
		public void Configure(EntityTypeBuilder<User> builder)
		{
			// Role relationship

			builder.Property(d => d.Status)
				.HasConversion<string>()
				.IsRequired()
				.HasMaxLength(50)
				.HasDefaultValue(UserStatusEnum.Active);

			builder.Property(d => d.Gender)
				.HasConversion<string>()
				.HasMaxLength(20);
		}
	}

	public class RoleConfiguration : IEntityTypeConfiguration<Role>
	{
		public void Configure(EntityTypeBuilder<Role> builder)
		{
			builder.Property(d => d.RoleName)
				.HasConversion<string>()
				.HasMaxLength(50)
				.HasDefaultValue(RoleEnum.User);
		}
	}

	public class UserActivityLogConfiguration : IEntityTypeConfiguration<UserActivityLog>
	{
		public void Configure(EntityTypeBuilder<UserActivityLog> builder)
		{
			builder.ToTable("UserActivityLogs");
			builder.Property(x => x.Action).IsRequired().HasMaxLength(200);
			builder.Property(x => x.RequestPath).HasMaxLength(500);
			builder.Property(x => x.HttpMethod).HasMaxLength(20);
			builder.Property(x => x.IpAddress).HasMaxLength(50);
			builder.Property(x => x.UserAgent).HasMaxLength(500);
			builder.Property(x => x.UserName).HasMaxLength(200);
			builder.Property(x => x.Email).HasMaxLength(200);

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.SetNull);

			builder.HasIndex(x => x.CreatedAt);
			builder.HasIndex(x => new { x.UserId, x.CreatedAt });
		}
	}

	public class AccountPolicyConfiguration : IEntityTypeConfiguration<AccountPolicy>
	{
		public void Configure(EntityTypeBuilder<AccountPolicy> builder)
		{
			builder.ToTable("AccountPolicies");

			builder.Property(x => x.UserId)
				.IsRequired()
				.HasMaxLength(36);

			builder.Property(x => x.PolicyName)
				.HasConversion<string>()
				.HasMaxLength(100)
				.IsRequired();

			builder.Property(x => x.PolicyRule)
				.IsRequired();

			builder.HasOne(x => x.User)  //connect user with account policy
				.WithMany(u => u.AccountPolicies)
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasIndex(x => new { x.UserId, x.PolicyName });
		}
	}
}
