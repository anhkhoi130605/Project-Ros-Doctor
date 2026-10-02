using Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.UserConfiguration
{
	public class WorkspaceConfiguration : IEntityTypeConfiguration<Workspace>
	{
		public void Configure(EntityTypeBuilder<Workspace> builder)
		{
			builder.ToTable("workspaces");

			builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
			builder.Property(x => x.Description).HasMaxLength(255);
			builder.Property(x => x.OwnerId).IsRequired();

			builder.HasOne(x => x.Owner)
				.WithMany()
				.HasForeignKey(x => x.OwnerId)
				.OnDelete(DeleteBehavior.Restrict);
		}
	}

	public class WorkspaceMemberConfiguration : IEntityTypeConfiguration<WorkspaceMember>
	{
		public void Configure(EntityTypeBuilder<WorkspaceMember> builder)
		{
			builder.ToTable("members");

			builder.Property(x => x.WorkspaceId).IsRequired();
			builder.Property(x => x.UserId).IsRequired();
			builder.Property(x => x.RoleId).IsRequired();

			builder.HasOne(x => x.Workspace)
				.WithMany(w => w.Members)
				.HasForeignKey(x => x.WorkspaceId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasOne(x => x.User)
				.WithMany()
				.HasForeignKey(x => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasOne(x => x.Role)
				.WithMany()
				.HasForeignKey(x => x.RoleId)
				.OnDelete(DeleteBehavior.Restrict);
		}
	}
}
