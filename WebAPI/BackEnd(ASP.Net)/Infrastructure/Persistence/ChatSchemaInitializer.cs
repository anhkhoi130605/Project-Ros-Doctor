using System;
using System.Threading.Tasks;
using Infrastructure.Persistence.Mongo;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence
{
    /// <summary>
    /// Encapsulates MySQL table and MongoDB collection/index bootstrapping for the Chat system.
    /// Keeps Program.cs clean and adheres to Infrastructure layer responsibilities.
    /// </summary>
    public static class ChatSchemaInitializer
    {
        public static async Task EnsureSchemaAsync(
            AppDbContext dbContext,
            IMongoDbContext? mongoContext,
            ILogger? logger = null)
        {
            // 1. Dùng EF Core Migrate chuẩn để áp dụng Migrations tự động trên MySQL
            try
            {
                await dbContext.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Lỗi khi tự động áp dụng EF Core Migrations.");
            }

            if (mongoContext != null)
            {
                try
                {
                    await MongoDbInitializer.InitializeCollectionsAsync(mongoContext);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "Lỗi khi tự động khởi tạo MongoDB chat collections.");
                }
            }
        }
    }
}
