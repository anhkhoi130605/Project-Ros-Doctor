using System;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo.Repositories
{
	public class ReportSnapshotRepository : IReportSnapshotRepository
	{
		private readonly IMongoDbContext _context;

		public ReportSnapshotRepository(IMongoDbContext context)
		{
			_context = context;
		}

		public async Task<ReportSnapshotDocument?> GetByReportIdAsync(string reportId, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.ReportSnapshots == null) return null;
				return await _context.ReportSnapshots
					.Find(s => s.ReportId == reportId)
					.FirstOrDefaultAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[ReportSnapshotRepository] Failed to read snapshot for {reportId}: {ex.Message}");
				return null;
			}
		}

		public async Task CreateSnapshotAsync(ReportSnapshotDocument snapshot, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.ReportSnapshots == null) return;
				await _context.ReportSnapshots.InsertOneAsync(snapshot, cancellationToken: cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[ReportSnapshotRepository] Failed to insert snapshot: {ex.Message}");
			}
		}
	}
}
