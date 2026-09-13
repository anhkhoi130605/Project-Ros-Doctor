using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain.Entities.AboutClub;
using Domain.Entities.Information;
using static Domain.Enums.List;

namespace Infrastructure.Persistence.Configurations.ClubConfiguration
{
	public class InformationClubConfiguration : IEntityTypeConfiguration<InformationClub>
	{
		public void Configure(EntityTypeBuilder<InformationClub> builder)
		{
			// Club name is required
			builder.Property(d => d.ClubName)
				.IsRequired()
				.HasMaxLength(200);

			// Logo and CoverImage
			builder.Property(d => d.Logo)
				.HasMaxLength(500);

			builder.Property(d => d.CoverImage)
				.HasMaxLength(500);

			// Email validation
			builder.Property(d => d.Email)
				.HasMaxLength(100);

			// Phone
			builder.Property(d => d.Phone)
				.HasMaxLength(20);

			// Address
			builder.Property(d => d.Address)
				.HasMaxLength(300);

			// Website and Social
			builder.Property(d => d.Website)
				.HasMaxLength(200);

			builder.Property(d => d.FacebookUrl)
				.HasMaxLength(200);


			// One-to-Many relationship with ProfileClub
			builder.HasMany(d => d.Members)
				.WithOne(p => p.Club)
				.HasForeignKey(p => p.ClubId)
				.OnDelete(DeleteBehavior.Cascade);
		}
	}

	public class InclubConfiguration : IEntityTypeConfiguration<Inclub>
	{
		public void Configure(EntityTypeBuilder<Inclub> builder)
		{
			// ProfileId is represented by the shared primary key Id, pointing to ProfileUser
			builder.HasOne(d => d.ProfileUser)
				.WithOne()
				.HasForeignKey<Inclub>(d => d.Id)
				.OnDelete(DeleteBehavior.Cascade);

			// ClubId is required and Foreign Key
			builder.Property(d => d.ClubId)
				.IsRequired()
				.HasMaxLength(255);

			// Role
			builder.Property(d => d.Role)
				.HasMaxLength(100);

			// Position
			builder.Property(d => d.Position)
				.HasMaxLength(100);

			// Default IsActive to true
			builder.Property(d => d.IsActiveClub)
			    .HasConversion<string>()
				.HasDefaultValue(IsActiveClubEnum.Active);

			// Department
			builder.Property(d => d.Department)
				.HasMaxLength(100);

			// Email
			builder.Property(d => d.Email)
				.HasMaxLength(100);

			// Phone
			builder.Property(d => d.Phone)
				.HasMaxLength(20);

			// BlackList - Convert enum to string with default value
			builder.Property(d => d.IsBlackList)
				.HasConversion<string>()
				.HasDefaultValue(IsBlackListEnum.WhiteList);

			// Create index for ProfileId and ClubId (represented by Id and ClubId)
			builder.HasIndex(d => new { d.Id, d.ClubId })
				.IsUnique();
		}
	}

	public class MemberInclubConfiguration : IEntityTypeConfiguration<MemberInclub>
	{
		public void Configure(EntityTypeBuilder<Domain.Entities.AboutClub.MemberInclub> builder)
		{
			// ProfileId (shadow property) and ClubId
			builder.Property<string>("ProfileId")
				.IsRequired()
				.HasMaxLength(255);

			builder.Property(d => d.ClubId)
				.IsRequired()
				.HasMaxLength(255);

			// Role and Position
			builder.Property(d => d.Role)
				.HasMaxLength(100);

			builder.Property(d => d.Position)
				.HasMaxLength(100);

			// Defaults
			builder.Property(d => d.IsActive)
				.HasDefaultValue(true);

			// Enum conversions to string
			builder.Property(d => d.IsBlackList)
				.HasConversion<string>()
				.HasDefaultValue(IsBlackListEnum.WhiteList);

			builder.Property(d => d.DepartmentOfClub)
				.HasConversion<string>();

			// Optional link to Inclub
			builder.Property(d => d.InclubId)
				.HasMaxLength(255);

			builder.HasOne(d => d.Inclub)
				.WithMany()
				.HasForeignKey(d => d.InclubId)
				.OnDelete(DeleteBehavior.Cascade);

			// FKs to Profile and User
			builder.HasOne(d => d.Profile)
				.WithMany()
				.HasForeignKey("ProfileId")
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasOne(d => d.User)
				.WithMany()
				.HasForeignKey(d => d.UserId)
				.OnDelete(DeleteBehavior.SetNull);

			// Unique per profile+club
			builder.HasIndex("ProfileId", "ClubId").IsUnique();
			builder.Property(d => d.DepartmentOfClub)
				.HasConversion<string>();
		}
	}

	public class OutClubConfiguration : IEntityTypeConfiguration<OutClub>
	{
		public void Configure(EntityTypeBuilder<OutClub> builder)
		{
			// ClubId is required and Foreign Key
			builder.Property(d => d.ClubId)
				.IsRequired()
				.HasMaxLength(255);

			// ReasonForLeaving
			builder.Property(d => d.ReasonForLeaving)
				.HasMaxLength(500);

			// LastRole
			builder.Property(d => d.LastRole)
				.HasMaxLength(100);

			// LastPosition
			builder.Property(d => d.LastPosition)
				.HasMaxLength(100);

			// Department
			builder.Property(d => d.Department)
				.HasMaxLength(100);

			// Email
			builder.Property(d => d.Email)
				.HasMaxLength(100);

			// Phone
			builder.Property(d => d.Phone)
				.HasMaxLength(20);

			// BlackList - Convert enum to string with default value
			builder.Property(d => d.IsBlackList)
				.HasConversion<string>()
				.HasDefaultValue(IsBlackListEnum.WhiteList);

			// Foreign Key relationship with Profile (represented by the shared primary key Id)
			builder.HasOne(d => d.Profile)
				.WithOne()
				.HasForeignKey<OutClub>(d => d.Id)
				.OnDelete(DeleteBehavior.Cascade);

			// Create index for ProfileId and ClubId (represented by Id and ClubId)
			builder.HasIndex(d => new { d.Id, d.ClubId })
				.IsUnique();
		}
	}

	public class BlackListConfiguration : IEntityTypeConfiguration<BlackList>
	{
		public void Configure(EntityTypeBuilder<BlackList> builder)
		{
			// Reason is required
			builder.Property(d => d.Reason)
				.IsRequired()
				.HasMaxLength(500);
		}
	}
}
