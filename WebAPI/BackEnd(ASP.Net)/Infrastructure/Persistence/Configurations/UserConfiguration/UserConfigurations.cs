using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.AboutUser;
using static Domain.Enums.UserEnum;

namespace Infrastructure.Persistence.Configurations.UserConfiguration
{
	public class UserConfiguration : IEntityTypeConfiguration<User>
	{
		public void Configure(EntityTypeBuilder<User> builder)
		{
			// Role relationship
			builder.HasOne(d => d.Role)
				.WithMany(p => p.Users)
				.HasForeignKey(d => d.RoleId)
				.OnDelete(DeleteBehavior.Restrict);

			builder.Property(d => d.MemberInOrOutClub)
				.HasConversion<string>()
				.IsRequired()
				.HasMaxLength(100)
				.HasDefaultValue(MemberInOrOutClubEnum.OutClub);
			builder.Property(d=>d.Status)
				.HasConversion<string>()
				.IsRequired()
				.HasDefaultValue(UserStatusEnum.Active);
			builder.Property(d => d.Gender)
				.HasConversion<string>();
				 
		}
	}

	public class RoleConfiguration : IEntityTypeConfiguration<Role>
	{
		public void Configure(EntityTypeBuilder<Role> builder)
		{
			builder.Property(d => d.RoleName)
				.HasConversion<string>()
				.HasDefaultValue(RoleEnum.User);
		}
	}
}
