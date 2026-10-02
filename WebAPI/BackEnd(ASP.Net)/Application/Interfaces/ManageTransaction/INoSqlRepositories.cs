using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities.NoSql;

namespace Application.Interfaces.Repositories
{
	public interface IReportSnapshotRepository
	{
		Task<ReportSnapshotDocument?> GetByReportIdAsync(string reportId, CancellationToken cancellationToken = default);
		Task CreateSnapshotAsync(ReportSnapshotDocument snapshot, CancellationToken cancellationToken = default);
	}

	public interface ISessionEvidenceRepository
	{
		Task<FindingEvidenceDocument?> GetByFindingIdAsync(string findingId, CancellationToken cancellationToken = default);
		Task<List<FindingEvidenceDocument>> GetBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default);
		Task<List<FindingEvidenceDocument>> GetAllEvidencesAsync(CancellationToken cancellationToken = default);
		Task InsertEvidencesAsync(IEnumerable<FindingEvidenceDocument> documents, CancellationToken cancellationToken = default);

		Task<SessionTfTreeDocument?> GetTfTreeBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default);
		Task InsertTfTreeAsync(SessionTfTreeDocument doc, CancellationToken cancellationToken = default);

		Task InsertTopicMetricsTimeseriesAsync(IEnumerable<TopicMetricsTimeseriesDocument> documents, CancellationToken cancellationToken = default);
	}
}
