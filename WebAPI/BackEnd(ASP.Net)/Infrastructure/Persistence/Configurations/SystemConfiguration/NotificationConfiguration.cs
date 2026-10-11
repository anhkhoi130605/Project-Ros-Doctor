using Domain.Entities.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.SystemConfiguration
{
	public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
	{
		public void Configure(EntityTypeBuilder<Notification> builder)
		{
			builder.ToTable("notifications");

			builder.Property(x => x.Title).HasMaxLength(255);
			builder.Property(x => x.Message).HasMaxLength(2000);
			builder.Property(x => x.Type).HasMaxLength(50);
			builder.Property(x => x.RelatedEntityId).HasMaxLength(100);
			builder.Property(x => x.IsRead).HasDefaultValue(false);

			builder.HasOne(x => x.User)
				.WithMany()
				.OnDelete(DeleteBehavior.Cascade);

			builder.HasIndex(x => x.CreatedAt);
		}
	}
}
