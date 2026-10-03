using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo
{
	public interface IMongoDbContext
	{
		IMongoDatabase? Database { get; }
		IMongoCollection<SessionTfTreeDocument>? SessionTfTrees { get; }
		IMongoCollection<FindingEvidenceDocument>? FindingsEvidence { get; }
		IMongoCollection<TopicMetricsTimeseriesDocument>? TopicMetricsTimeseries { get; }
		IMongoCollection<AgentExecutionTraceDocument>? AgentExecutionTraces { get; }
		IMongoCollection<BenchmarkDatasetDocument>? BenchmarkDatasets { get; }
		IMongoCollection<BenchmarkEvaluationDocument>? BenchmarkEvaluations { get; }
		IMongoCollection<ReportSnapshotDocument>? ReportSnapshots { get; }
	}
}
