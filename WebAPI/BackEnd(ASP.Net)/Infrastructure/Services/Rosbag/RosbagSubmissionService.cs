using System.IO.Compression;
using Application.Interfaces.Rosbag;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;
using RosbagEntity = Domain.Entities.RosbagAnalysis.Rosbag;
using Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Infrastructure.Services.Rosbag;

public class RosbagSubmissionService(AppDbContext db, IHostEnvironment environment,
    IConfiguration configuration) : IRosbagSubmissionService
{
    public const long MaxBytes = 512L * 1024 * 1024;
    private string StorageRoot => Path.GetFullPath(configuration["RosbagSubmissions:StoragePath"]
        ?? Path.Combine(environment.ContentRootPath, "App_Data", "rosbag-submissions"));

    private static RosbagSubmissionDto Dto(RosbagEntity s) => new(s.Id, s.UserId, s.FileName,
        s.SizeBytes, s.Description ?? "", s.ReviewStatus.ToString(), s.TopicCount, s.ReviewerId, s.ReviewNote,
        s.CreatedAt, s.ReviewedAt);

    public async Task<IReadOnlyList<RosbagSubmissionDto>> ListAsync(string userId, bool canReview, CancellationToken ct)
    {
        var entries = await db.Rosbags.AsNoTracking()
            .Where(s => s.DeletedAt == null && (canReview || s.UserId == userId)
                && (s.ReviewStatus != RosbagReviewStatus.Approved || s.ReviewedAt != null))
            .OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
        return entries.Select(Dto).ToList();
    }

    public async Task<IReadOnlyList<RosbagSubmissionDto>> PendingAsync(CancellationToken ct)
    {
        var entries = await db.Rosbags.AsNoTracking()
            .Where(s => s.DeletedAt == null && s.ReviewStatus == RosbagReviewStatus.Submitted)
            .OrderBy(s => s.CreatedAt).ToListAsync(ct);
        return entries.Select(Dto).ToList();
    }

    public async Task<RosbagSubmissionDto> SubmitAsync(string userId, Stream file, string fileName, string description, CancellationToken ct)
    {
        var name = Path.GetFileName(fileName.Replace('\\', '/'));
        var ext = Path.GetExtension(name).ToLowerInvariant();
        if (name.Length > 255 || ext is not (".db3" or ".zip"))
            throw new ArgumentException("Chỉ nhận .db3 hoặc .zip chứa một file .db3 (tối đa 512 MB). Bộ đọc hiện tại chưa hỗ trợ MCAP.");
        if (description.Length > 2000) throw new ArgumentException("Mô tả tối đa 2000 ký tự.");
        var submission = new RosbagEntity
        {
            Id = Guid.NewGuid().ToString("N"), UserId = userId, FileName = name,
            Description = description.Trim(), ReviewStatus = RosbagReviewStatus.Submitted,
            Status = RosbagStatus.Ready, Format = RosbagFormat.SQLite3,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId, UpdatedBy = userId, IsPublished = false
        };
        Directory.CreateDirectory(StorageRoot);
        var inputPath = Path.Combine(StorageRoot, submission.Id + ".upload");
        var bagPath = Path.Combine(StorageRoot, submission.Id + ".db3");
        submission.StorageUrl = bagPath;
        try
        {
            await using (var output = File.Create(inputPath))
                submission.SizeBytes = await CopyLimitedAsync(file, output, ct);
            if (ext == ".zip")
            {
                using var zip = ZipFile.OpenRead(inputPath);
                if (zip.Entries.Count > 1000) throw new ArgumentException("ZIP chứa quá nhiều tệp.");
                var bags = zip.Entries.Where(e => e.Name.EndsWith(".db3", StringComparison.OrdinalIgnoreCase)).ToList();
                if (bags.Count != 1) throw new ArgumentException("ZIP phải chứa đúng một file .db3; hãy gửi riêng từng phần rosbag.");
                if (bags[0].Length > MaxBytes) throw new ArgumentException("File giải nén vượt quá 512 MB.");
                // Never extract archive paths: copy only the selected entry to a server-generated name.
                await using var entry = bags[0].Open();
                await using var output = File.Create(bagPath);
                await CopyLimitedAsync(entry, output, ct);
            }
            else File.Move(inputPath, bagPath);
            submission.TopicCount = await ValidateBagAsync(bagPath, ct);
            submission.SizeBytes = new FileInfo(bagPath).Length;
            db.Rosbags.Add(submission);
            await db.SaveChangesAsync(ct);
            return Dto(submission);
        }
        catch
        {
            if (File.Exists(bagPath)) File.Delete(bagPath);
            throw;
        }
        finally { if (File.Exists(inputPath)) File.Delete(inputPath); }
    }

    public static async Task<long> CopyLimitedAsync(Stream source, Stream destination, CancellationToken ct)
    {
        var buffer = new byte[81920];
        long total = 0;
        int count;
        while ((count = await source.ReadAsync(buffer, ct)) > 0)
        {
            total += count;
            if (total > MaxBytes) throw new ArgumentException("Tệp vượt quá giới hạn 512 MB.");
            await destination.WriteAsync(buffer.AsMemory(0, count), ct);
        }
        if (total == 0) throw new ArgumentException("Tệp rỗng.");
        return total;
    }

    public static async Task<int> ValidateBagAsync(string path, CancellationToken ct)
    {
        try
        {
            await using var conn = new SqliteConnection(new SqliteConnectionStringBuilder
                { DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
            await conn.OpenAsync(ct);
            await using var cmd = conn.CreateCommand();
            cmd.CommandTimeout = 30;
            cmd.CommandText = "SELECT id, name, type, serialization_format FROM topics LIMIT 1";
            await using (var reader = await cmd.ExecuteReaderAsync(ct))
                if (!await reader.ReadAsync(ct)) throw new ArgumentException("Rosbag không có topic.");
            cmd.CommandText = "SELECT id, topic_id, timestamp, data FROM messages LIMIT 1";
            await using (var reader = await cmd.ExecuteReaderAsync(ct))
                if (!await reader.ReadAsync(ct)) throw new ArgumentException("Rosbag không có message.");
            cmd.CommandText = "SELECT COUNT(*) FROM topics";
            return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
        }
        catch (SqliteException) { throw new ArgumentException("Không đọc được rosbag SQLite3 hoặc thiếu cấu trúc topics/messages."); }
    }

    public async Task<bool> ReviewAsync(string id, string reviewerId, bool approve, string? reason, CancellationToken ct)
    {
        if ((!approve && string.IsNullOrWhiteSpace(reason)) || reason?.Length > 2000)
            throw new ArgumentException("Từ chối cần có lý do, tối đa 2000 ký tự.");
        // Compare-and-set prevents two reviewers from overwriting each other's decisions.
        return await db.Rosbags.Where(s => s.Id == id && s.DeletedAt == null
                && s.ReviewStatus == RosbagReviewStatus.Submitted)
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.ReviewStatus,
                    approve ? RosbagReviewStatus.Approved : RosbagReviewStatus.Rejected)
                .SetProperty(s => s.ReviewerId, reviewerId).SetProperty(s => s.ReviewNote, reason == null ? null : reason.Trim())
                .SetProperty(s => s.ReviewedAt, DateTime.UtcNow)
                .SetProperty(s => s.UpdatedAt, DateTime.UtcNow).SetProperty(s => s.UpdatedBy, reviewerId), ct) == 1;
    }

}
