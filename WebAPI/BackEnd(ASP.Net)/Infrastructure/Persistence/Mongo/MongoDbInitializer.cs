using System;
using System.Threading.Tasks;
using Domain.Entities.NoSql;
using MongoDB.Driver;

namespace Infrastructure.Persistence.Mongo
{
	public static class MongoDbInitializer
	{
		public static async Task InitializeCollectionsAsync(IMongoDbContext mongoContext)
		{
			var db = mongoContext.Database;
			if (db == null) return;
			var collectionsCursor = await db.ListCollectionNamesAsync();
			var existing = await collectionsCursor.ToListAsync();

			await EnsureCollectionAsync<SessionTfTreeDocument>(db, existing, "session_tf_trees", async col =>
			{
				var indexKeys = Builders<SessionTfTreeDocument>.IndexKeys.Ascending(x => x.SessionId);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<SessionTfTreeDocument>(indexKeys));
			});

			await EnsureCollectionAsync<FindingEvidenceDocument>(db, existing, "findings_evidence", async col =>
			{
				var indexKeys = Builders<FindingEvidenceDocument>.IndexKeys
					.Ascending(x => x.SessionId)
					.Ascending(x => x.FindingId);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<FindingEvidenceDocument>(indexKeys));
			});

			await EnsureCollectionAsync<TopicMetricsTimeseriesDocument>(db, existing, "topic_metrics_timeseries", async col =>
			{
				var indexKeys = Builders<TopicMetricsTimeseriesDocument>.IndexKeys
					.Ascending(x => x.SessionId)
					.Ascending(x => x.TopicName);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<TopicMetricsTimeseriesDocument>(indexKeys));
			});

			await EnsureCollectionAsync<AgentExecutionTraceDocument>(db, existing, "agent_execution_traces", async col =>
			{
				var indexKeys = Builders<AgentExecutionTraceDocument>.IndexKeys
					.Ascending(x => x.SessionId)
					.Ascending(x => x.Step);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<AgentExecutionTraceDocument>(indexKeys));
			});

			await EnsureCollectionAsync<BenchmarkDatasetDocument>(db, existing, "benchmark_datasets", async col =>
			{
				var indexKeys = Builders<BenchmarkDatasetDocument>.IndexKeys.Ascending(x => x.Code);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<BenchmarkDatasetDocument>(indexKeys));
			});

			await EnsureCollectionAsync<BenchmarkEvaluationDocument>(db, existing, "benchmark_evaluations", async col =>
			{
				var indexKeys = Builders<BenchmarkEvaluationDocument>.IndexKeys.Ascending(x => x.DatasetId);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<BenchmarkEvaluationDocument>(indexKeys));
			});

			await EnsureCollectionAsync<ReportSnapshotDocument>(db, existing, "report_snapshots", async col =>
			{
				var indexKeys = Builders<ReportSnapshotDocument>.IndexKeys
					.Ascending(x => x.ReportId)
					.Ascending(x => x.SessionId);
				await col.Indexes.CreateOneAsync(new CreateIndexModel<ReportSnapshotDocument>(indexKeys));
			});
		}

		private static async Task EnsureCollectionAsync<T>(
			IMongoDatabase db,
			System.Collections.Generic.List<string> existing,
			string name,
			Func<IMongoCollection<T>, Task> createIndexes)
		{
			if (!existing.Contains(name))
			{
				await db.CreateCollectionAsync(name);
			}
			var collection = db.GetCollection<T>(name);
			await createIndexes(collection);
		}
	}
}
