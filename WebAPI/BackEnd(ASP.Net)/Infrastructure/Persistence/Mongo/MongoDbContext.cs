using Application.Interfaces.Common;
using Domain.Entities.NoSql;
using Infrastructure.ConfigModel;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo
{
	public class MongoDbContext : IMongoDbContext
	{
		private readonly IMongoDatabase _database;

		public MongoDbContext(IOptions<MongoDbSettings> settings)
		{
			var client = new MongoClient(settings.Value.ConnectionString);
			_database = client.GetDatabase(settings.Value.DatabaseName);
		}

		public IMongoDatabase Database => _database;

		public IMongoCollection<SessionTfTreeDocument> SessionTfTrees =>
			_database.GetCollection<SessionTfTreeDocument>("session_tf_trees");

		public IMongoCollection<FindingEvidenceDocument> FindingsEvidence =>
			_database.GetCollection<FindingEvidenceDocument>("findings_evidence");

		public IMongoCollection<TopicMetricsTimeseriesDocument> TopicMetricsTimeseries =>
			_database.GetCollection<TopicMetricsTimeseriesDocument>("topic_metrics_timeseries");

		public IMongoCollection<AgentExecutionTraceDocument> AgentExecutionTraces =>
			_database.GetCollection<AgentExecutionTraceDocument>("agent_execution_traces");

		public IMongoCollection<BenchmarkDatasetDocument> BenchmarkDatasets =>
			_database.GetCollection<BenchmarkDatasetDocument>("benchmark_datasets");

		public IMongoCollection<BenchmarkEvaluationDocument> BenchmarkEvaluations =>
			_database.GetCollection<BenchmarkEvaluationDocument>("benchmark_evaluations");

		public IMongoCollection<ReportSnapshotDocument> ReportSnapshots =>
			_database.GetCollection<ReportSnapshotDocument>("report_snapshots");
	}
}
