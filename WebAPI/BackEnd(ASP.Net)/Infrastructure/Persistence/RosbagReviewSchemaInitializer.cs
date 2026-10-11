using System.Data;
using System.Data.Common;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence;

/// <summary>Development-only additive bootstrap; never applies the project's migration history.</summary>
public static class RosbagReviewSchemaInitializer
{
    public record Column(string Name, string Type, long? Length, bool Nullable, string? Default);
    public record Index(string Name, string Columns, bool NonUnique);
    public record ForeignKey(string Name, string Column, string Table, string TargetColumn, string DeleteRule);

    private static readonly (string Name, string Type, long? Length, bool Nullable, string? Default, string Sql)[] Definitions =
    [
        ("review_status", "varchar", 20, false, "Approved", "varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Approved'"),
        ("description", "varchar", 2000, true, null, "varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL"),
        ("reviewer_id", "varchar", 36, true, null, "varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL"),
        ("review_note", "varchar", 2000, true, null, "varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL"),
        ("reviewed_at", "datetime", null, true, null, "datetime(6) NULL")
    ];

    // Pure planning enables offline regression tests. Only constant, allowlisted DDL can be returned.
    public static IReadOnlyList<string> Plan(IReadOnlyList<Column> columns,
        IReadOnlyList<Index> indexes, IReadOnlyList<ForeignKey> foreignKeys)
    {
        var plan = new List<string>();
        foreach (var definition in Definitions)
        {
            var column = columns.SingleOrDefault(c => c.Name.Equals(definition.Name, StringComparison.OrdinalIgnoreCase));
            if (column == null)
                plan.Add($"ALTER TABLE `rosbags` ADD COLUMN `{definition.Name}` {definition.Sql};");
            else if (!column.Type.Equals(definition.Type, StringComparison.OrdinalIgnoreCase)
                || column.Length != definition.Length || column.Nullable != definition.Nullable
                || column.Default != definition.Default)
                throw new InvalidOperationException($"Cột rosbags.{definition.Name} đã tồn tại nhưng khác cấu trúc mong đợi. Không tự sửa cột hoặc dữ liệu; hãy kiểm tra schema.");
        }

        AddIndex("IX_rosbags_reviewer_id", "reviewer_id", "`reviewer_id`");
        AddIndex("IX_rosbags_review_status_CreatedAt", "review_status,CreatedAt", "`review_status`, `CreatedAt`");
        var namedKey = foreignKeys.SingleOrDefault(f => f.Name == "FK_rosbags_Users_reviewer_id");
        var reviewerKeys = foreignKeys.Where(f => f.Column.Split(',').Contains("reviewer_id")).ToList();
        if ((namedKey != null && namedKey.Column != "reviewer_id")
            || reviewerKeys.Any(f => f.Column != "reviewer_id" || f.Table != "Users" || f.TargetColumn != "Id" || f.DeleteRule != "SET NULL"))
            throw new InvalidOperationException("Khóa ngoại reviewer_id đã tồn tại nhưng khác cấu hình Users.Id / SET NULL. Không tự thay thế khóa ngoại.");
        if (reviewerKeys.Count == 0)
            plan.Add("ALTER TABLE `rosbags` ADD CONSTRAINT `FK_rosbags_Users_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `Users` (`Id`) ON DELETE SET NULL;");
        return plan;

        void AddIndex(string name, string columnNames, string sqlColumns)
        {
            var named = indexes.SingleOrDefault(i => i.Name == name);
            if (named != null && (named.Columns != columnNames || !named.NonUnique))
                throw new InvalidOperationException($"Chỉ mục {name} đã tồn tại nhưng khác cấu hình mong đợi. Không tự thay thế chỉ mục.");
            if (!indexes.Any(i => i.Columns == columnNames && i.NonUnique))
                plan.Add($"CREATE INDEX `{name}` ON `rosbags` ({sqlColumns});");
        }
    }

    public static async Task EnsureAsync(DbConnection connection, ILogger logger, CancellationToken ct = default)
    {
        var openedHere = connection.State != ConnectionState.Open;
        var locked = false;
        if (openedHere) await connection.OpenAsync(ct);
        try
        {
            // Connection-scoped MySQL lock serializes concurrent backend startups on the same schema.
            locked = Convert.ToInt32(await ScalarAsync("SELECT GET_LOCK(CONCAT('rosbag-review:', LEFT(SHA2(DATABASE(), 256), 40)), 30)", ct)) == 1;
            if (!locked) throw new InvalidOperationException("Không lấy được khóa khởi tạo rosbags. Hãy thử khởi động backend lại.");
            var tables = Convert.ToInt32(await ScalarAsync("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('rosbags', 'Users') AND TABLE_TYPE = 'BASE TABLE'", ct));
            if (tables != 2) throw new InvalidOperationException("Database đang cấu hình phải có sẵn bảng rosbags và Users. Bộ khởi tạo không tạo database hoặc bảng mới.");

            var columns = new List<Column>();
            await using (var cmd = Command("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rosbags'"))
            await using (var reader = await cmd.ExecuteReaderAsync(ct))
                while (await reader.ReadAsync(ct))
                    columns.Add(new(reader.GetString(0), reader.GetString(1), reader.IsDBNull(2) ? null : Convert.ToInt64(reader.GetValue(2)), reader.GetString(3) == "YES", reader.IsDBNull(4) ? null : reader.GetString(4)));

            var indexes = new List<Index>();
            await using (var cmd = Command("SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MIN(NON_UNIQUE) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rosbags' GROUP BY INDEX_NAME"))
            await using (var reader = await cmd.ExecuteReaderAsync(ct))
                while (await reader.ReadAsync(ct))
                    indexes.Add(new(reader.GetString(0), reader.IsDBNull(1) ? "" : reader.GetString(1), Convert.ToInt32(reader.GetValue(2)) == 1));

            var keys = new List<ForeignKey>();
            await using (var cmd = Command("SELECT k.CONSTRAINT_NAME, GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION), k.REFERENCED_TABLE_NAME, GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION), r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME = r.CONSTRAINT_NAME AND k.TABLE_NAME = r.TABLE_NAME WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'rosbags' AND k.REFERENCED_TABLE_NAME IS NOT NULL GROUP BY k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, r.DELETE_RULE"))
            await using (var reader = await cmd.ExecuteReaderAsync(ct))
                while (await reader.ReadAsync(ct))
                    keys.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4)));

            // Validate existing objects before executing any DDL; never ALTER/DROP an existing column.
            var statements = Plan(columns, indexes, keys);
            foreach (var sql in statements)
            {
                await using var cmd = Command(sql);
                await cmd.ExecuteNonQueryAsync(ct);
            }
            logger.LogInformation("Rosbag review schema ready. Applied {Count} additive statements; existing data and migration history were not rewritten.", statements.Count);
        }
        finally
        {
            try
            {
                if (locked && connection.State == ConnectionState.Open)
                    await ScalarAsync("SELECT RELEASE_LOCK(CONCAT('rosbag-review:', LEFT(SHA2(DATABASE(), 256), 40)))", CancellationToken.None);
            }
            finally { if (openedHere) await connection.CloseAsync(); }
        }

        DbCommand Command(string sql)
        {
            var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 60;
            return command;
        }
        async Task<object?> ScalarAsync(string sql, CancellationToken token)
        {
            await using var command = Command(sql);
            return await command.ExecuteScalarAsync(token);
        }
    }
}
