using Domain.Entities.System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.SystemConfiguration
{
	public class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
	{
		public void Configure(EntityTypeBuilder<ChatConversation> builder)
		{
			builder.ToTable("chat_conversations");

			builder.HasKey(x => x.Id);

			builder.Property(x => x.Title)
				.HasMaxLength(255)
				.IsRequired();

			builder.Property(x => x.Type)
				.HasMaxLength(50)
				.HasDefaultValue("Role")
				.IsRequired();

			builder.Property(x => x.TargetRole)
				.HasMaxLength(100);

			builder.Property(x => x.AvatarUrl)
				.HasMaxLength(500);

			builder.Property(x => x.CreatorId)
				.HasMaxLength(100);

			builder.Property(x => x.LastMessageContent)
				.HasMaxLength(2000);

			builder.Property(x => x.LastSenderName)
				.HasMaxLength(255);

			builder.Property(x => x.IsActive)
				.HasDefaultValue(true);

			builder.HasIndex(x => x.TargetRole);
			builder.HasIndex(x => x.LastMessageAt);
		}
	}
}
