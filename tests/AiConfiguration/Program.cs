using Domain.Entities.Configuration;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

// Only inspect the EF model and generated SQL. Never connect to a database.
using var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
    .UseMySql("Server=localhost;Database=mapping_test;User=test", ServerVersion.Parse("8.4.8-mysql"))
    .Options);
var entity = context.Model.FindEntityType(typeof(AiSetting))!;
var table = StoreObjectIdentifier.Table("ai_settings", entity.GetSchema());
var userId = entity.FindProperty(nameof(AiSetting.UserId))!;

Check(entity.GetTableName() == "ai_settings", "AI settings use the existing ai_settings table");
Check(userId.GetColumnName(table) == "user_id", "UserId maps to the existing user_id column");
Check(!userId.IsNullable && userId.GetMaxLength() == 36, "UserId constraints are unchanged");
Check(entity.GetForeignKeys().Any(fk => fk.Properties.Contains(userId)), "User relationship is preserved");

var sql = context.AiSettings.AsNoTracking().ToQueryString();
Check(sql.Contains("`user_id`") && !sql.Contains("`UserId`") && !sql.Contains("`userid`"),
    "AI settings SELECT uses user_id, not an inferred UserId column");
Console.WriteLine("5 checks passed. No database connection or writes.");

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
    Console.WriteLine("PASS " + message);
}
