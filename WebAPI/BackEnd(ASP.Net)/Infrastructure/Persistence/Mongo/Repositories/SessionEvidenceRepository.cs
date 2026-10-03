using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo.Repositories
{
	public class SessionEvidenceRepository : ISessionEvidenceRepository
	{
		private readonly IMongoDbContext _context;

		public SessionEvidenceRepository(IMongoDbContext context)
		{
			_context = context;
		}

		public async Task<FindingEvidenceDocument?> GetByFindingIdAsync(string findingId, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.FindingsEvidence == null) return null;
				return await _context.FindingsEvidence
					.Find(e => e.FindingId == findingId)
					.FirstOrDefaultAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to get evidence for finding {findingId}: {ex.Message}");
				return null;
			}
		}

		public async Task<List<FindingEvidenceDocument>> GetBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.FindingsEvidence == null) return new List<FindingEvidenceDocument>();
				return await _context.FindingsEvidence
					.Find(e => e.SessionId == sessionId)
					.ToListAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to get evidences for session {sessionId}: {ex.Message}");
				return new List<FindingEvidenceDocument>();
			}
		}

		public async Task<List<FindingEvidenceDocument>> GetAllEvidencesAsync(CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.FindingsEvidence == null) return new List<FindingEvidenceDocument>();
				return await _context.FindingsEvidence
					.Find(_ => true)
					.ToListAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to get all evidences: {ex.Message}");
				return new List<FindingEvidenceDocument>();
			}
		}

		public async Task InsertEvidencesAsync(IEnumerable<FindingEvidenceDocument> documents, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.FindingsEvidence == null) return;
				await _context.FindingsEvidence.InsertManyAsync(documents, cancellationToken: cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to insert evidences: {ex.Message}");
			}
		}

		public async Task<SessionTfTreeDocument?> GetTfTreeBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.SessionTfTrees == null) return null;
				return await _context.SessionTfTrees
					.Find(t => t.SessionId == sessionId)
					.FirstOrDefaultAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to get TF tree for {sessionId}: {ex.Message}");
				return null;
			}
		}

		public async Task InsertTfTreeAsync(SessionTfTreeDocument doc, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.SessionTfTrees == null) return;
				await _context.SessionTfTrees.InsertOneAsync(doc, cancellationToken: cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to insert TF tree: {ex.Message}");
			}
		}

		public async Task InsertTopicMetricsTimeseriesAsync(IEnumerable<TopicMetricsTimeseriesDocument> documents, CancellationToken cancellationToken = default)
		{
			try
			{
				if (_context.TopicMetricsTimeseries == null) return;
				await _context.TopicMetricsTimeseries.InsertManyAsync(documents, cancellationToken: cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[SessionEvidenceRepository] Failed to insert topic metrics: {ex.Message}");
			}
		}
	}
}
