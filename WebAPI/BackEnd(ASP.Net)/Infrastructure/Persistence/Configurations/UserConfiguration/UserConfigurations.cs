using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.Information;
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

            // Profile one-to-one relationship (Profile owns FK)
			builder.HasOne(d => d.Profile)
				.WithOne(p => p.User)
				.HasForeignKey<ProfileUser>(p => p.Id)
				.OnDelete(DeleteBehavior.Cascade);
			builder.Property(d => d.MemberInOrOutClub)
				.HasConversion<string>()
				.IsRequired()
				.HasMaxLength(100)
				.HasDefaultValue(MemberInOrOutClubEnum.OutClub);
			// Notifications
			builder.HasMany(d => d.Notifications)
				.WithOne(p => p.User)
				.HasForeignKey(p => p.Id)
				.OnDelete(DeleteBehavior.Cascade);
			builder.Property(d=>d.Status)
				.HasConversion<string>()
				.IsRequired()
				.HasDefaultValue(UserStatusEnum.Active);
           // InformationOfSchool: create unique index on StudentId
			builder.HasIndex(d => d.StudentId).IsUnique();
			builder.Property(d => d.Gender)
				.HasConversion<string>();
          builder.Property(d => d.StudentId)
				.HasColumnType("varchar(8)")
				.IsRequired()
				.HasMaxLength(8);
			// Unique index on StudentId
			builder.HasIndex(d => d.StudentId).IsUnique();
				 
		}
	}

	public class ProfileConfiguration : IEntityTypeConfiguration<ProfileUser>
	{
		public void Configure(EntityTypeBuilder<ProfileUser> builder)
		{
            builder.HasIndex(d => d.Id).IsUnique();

			builder.HasOne(d => d.Department)
				.WithMany()
				.HasForeignKey(d => d.DepartmentId)
				.OnDelete(DeleteBehavior.SetNull);
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
