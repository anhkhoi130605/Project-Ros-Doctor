using System;
using Domain.Entities.NoSql;
using Infrastructure.ConfigModel;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo
{
	public class MongoDbContext : IMongoDbContext
	{
		private readonly IMongoDatabase? _database;

		public MongoDbContext(IOptions<MongoDbSettings> settings)
		{
			var connStr = settings?.Value?.ConnectionString;
			if (!string.IsNullOrWhiteSpace(connStr))
			{
				try
				{
					var client = new MongoClient(connStr);
					var dbName = string.IsNullOrWhiteSpace(settings?.Value?.DatabaseName) ? "ctrl_shift_n" : settings.Value.DatabaseName;
					_database = client.GetDatabase(dbName);
				}
				catch (Exception ex)
				{
					Console.WriteLine($"[MongoDB] Warning: Failed to connect to MongoDB '{connStr}': {ex.Message}");
				}
			}
			else
			{
				Console.WriteLine("[MongoDB] ConnectionString is empty. MongoDB features will run in safe no-op mode.");
			}
		}

		public IMongoDatabase? Database => _database;

		public IMongoCollection<SessionTfTreeDocument>? SessionTfTrees =>
			_database?.GetCollection<SessionTfTreeDocument>("session_tf_trees");

		public IMongoCollection<FindingEvidenceDocument>? FindingsEvidence =>
			_database?.GetCollection<FindingEvidenceDocument>("findings_evidence");

		public IMongoCollection<TopicMetricsTimeseriesDocument>? TopicMetricsTimeseries =>
			_database?.GetCollection<TopicMetricsTimeseriesDocument>("topic_metrics_timeseries");

		public IMongoCollection<AgentExecutionTraceDocument>? AgentExecutionTraces =>
			_database?.GetCollection<AgentExecutionTraceDocument>("agent_execution_traces");

		public IMongoCollection<BenchmarkDatasetDocument>? BenchmarkDatasets =>
			_database?.GetCollection<BenchmarkDatasetDocument>("benchmark_datasets");

		public IMongoCollection<BenchmarkEvaluationDocument>? BenchmarkEvaluations =>
			_database?.GetCollection<BenchmarkEvaluationDocument>("benchmark_evaluations");

		public IMongoCollection<ReportSnapshotDocument>? ReportSnapshots =>
			_database?.GetCollection<ReportSnapshotDocument>("report_snapshots");

		public IMongoCollection<ChatMessageDocument>? ChatMessages =>
			_database?.GetCollection<ChatMessageDocument>("chat_messages");
	}
}
