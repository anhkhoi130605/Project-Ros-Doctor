using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag;
using Application.Interfaces.Rosbag.Analyzers;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Rosbag
{
	/// <summary>
	/// RosbagInspectorService điều phối mô hình Pipeline chẩn đoán 2 tầng:
	/// - Tầng 1: SQL Metadata Analyzers (ITopicDropoutAnalyzer, IFrequencyDropAnalyzer, ITimestampSyncAnalyzer)
	/// - Tầng 2: CDR Payload Analyzers (ITfTreeIntegrityAnalyzer, ISensorPayloadAnalyzer)
	/// - Tầng 3: Finding Aggregator & Severity Ranker (IFindingAggregator)
	/// </summary>
	public class RosbagInspectorService : IRosbagInspectorService
	{
		private readonly IConfiguration _configuration;
		private readonly ILogger<RosbagInspectorService> _logger;
		private readonly ITopicDropoutAnalyzer _topicDropoutAnalyzer;
		private readonly IFrequencyDropAnalyzer _frequencyDropAnalyzer;
		private readonly ITimestampSyncAnalyzer _timestampSyncAnalyzer;
		private readonly ITfTreeIntegrityAnalyzer _tfTreeIntegrityAnalyzer;
		private readonly ISensorPayloadAnalyzer _sensorPayloadAnalyzer;
		private readonly IFindingAggregator _findingAggregator;

		public RosbagInspectorService(
			IConfiguration configuration,
			ILogger<RosbagInspectorService> logger,
			ITopicDropoutAnalyzer topicDropoutAnalyzer,
			IFrequencyDropAnalyzer frequencyDropAnalyzer,
			ITimestampSyncAnalyzer timestampSyncAnalyzer,
			ITfTreeIntegrityAnalyzer tfTreeIntegrityAnalyzer,
			ISensorPayloadAnalyzer sensorPayloadAnalyzer,
			IFindingAggregator findingAggregator)
		{
			_configuration = configuration;
			_logger = logger;
			_topicDropoutAnalyzer = topicDropoutAnalyzer;
			_frequencyDropAnalyzer = frequencyDropAnalyzer;
			_timestampSyncAnalyzer = timestampSyncAnalyzer;
			_tfTreeIntegrityAnalyzer = tfTreeIntegrityAnalyzer;
			_sensorPayloadAnalyzer = sensorPayloadAnalyzer;
			_findingAggregator = findingAggregator;
		}

		public async Task<IReadOnlyList<SampleBagInfoDto>> GetSampleBagsAsync(CancellationToken cancellationToken = default)
		{
			var sampleDirs = GetPossibleSampleDirectories();
			var results = new List<SampleBagInfoDto>();
			var seenPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

			foreach (var dir in sampleDirs)
			{
				if (!Directory.Exists(dir)) continue;

				var dirInfo = new DirectoryInfo(dir);

				// Find subdirectories matching rosbag2_*
				foreach (var subDir in dirInfo.GetDirectories("rosbag2_*", SearchOption.AllDirectories))
				{
					if (seenPaths.Contains(subDir.FullName)) continue;
					seenPaths.Add(subDir.FullName);

					var db3Files = subDir.GetFiles("*.db3", SearchOption.AllDirectories);
					var yamlFiles = subDir.GetFiles("*.yaml", SearchOption.AllDirectories);
					var totalSize = db3Files.Sum(f => f.Length) + yamlFiles.Sum(f => f.Length);

					results.Add(new SampleBagInfoDto
					{
						Name = subDir.Name,
						Path = subDir.FullName,
						SizeBytes = totalSize,
						Format = "sqlite3",
						HasYaml = yamlFiles.Length > 0,
						CreatedDate = subDir.CreationTimeUtc.ToString("o")
					});
				}

				// Find standalone .db3 files
				foreach (var file in dirInfo.GetFiles("*.db3", SearchOption.AllDirectories))
				{
					if (seenPaths.Contains(file.FullName) || (file.Directory != null && seenPaths.Contains(file.Directory.FullName)))
						continue;

					seenPaths.Add(file.FullName);
					results.Add(new SampleBagInfoDto
					{
						Name = file.Name,
						Path = file.FullName,
						SizeBytes = file.Length,
						Format = "sqlite3",
						HasYaml = File.Exists(Path.Combine(file.DirectoryName ?? "", "metadata.yaml")),
						CreatedDate = file.CreationTimeUtc.ToString("o")
					});
				}
			}

			return results.OrderByDescending(s => s.CreatedDate).ToList();
		}

		public async Task<RosbagInspectionReportDto> InspectSampleAsync(string? sampleName = null, CancellationToken cancellationToken = default)
		{
			var samples = await GetSampleBagsAsync(cancellationToken);
			if (samples.Count == 0)
			{
				throw new FileNotFoundException("Không tìm thấy rosbag mẫu nào trong hệ thống. Vui lòng kiểm tra thư mục Data.");
			}

			SampleBagInfoDto? target = null;
			if (!string.IsNullOrWhiteSpace(sampleName))
			{
				target = samples.FirstOrDefault(s => s.Name.Contains(sampleName, StringComparison.OrdinalIgnoreCase)
				                                     || s.Path.Contains(sampleName, StringComparison.OrdinalIgnoreCase));
			}

			target ??= samples.First();
			return await InspectBagAsync(target.Path, cancellationToken);
		}

		public async Task<RosbagInspectionReportDto> InspectUploadedFileAsync(
			Stream fileStream,
			string fileName,
			Stream? yamlStream = null,
			string? yamlFileName = null,
			CancellationToken cancellationToken = default)
		{
			var safeFileName = Path.GetFileName(fileName);
			var tempFolder = Path.Combine(Path.GetTempPath(), "rosbags_upload", Guid.NewGuid().ToString("N")[..8]);
			Directory.CreateDirectory(tempFolder);

			if (safeFileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
			{
				var zipFilePath = Path.Combine(tempFolder, safeFileName);
				await using (var outputStream = File.Create(zipFilePath))
				{
					await fileStream.CopyToAsync(outputStream, cancellationToken);
				}
				System.IO.Compression.ZipFile.ExtractToDirectory(zipFilePath, tempFolder);
				var foundDb3 = Directory.GetFiles(tempFolder, "*.db3", SearchOption.AllDirectories).FirstOrDefault();
				if (foundDb3 != null)
				{
					return await InspectBagAsync(foundDb3, cancellationToken);
				}
			}

			var tempFilePath = Path.Combine(tempFolder, safeFileName);
			await using (var outputStream = File.Create(tempFilePath))
			{
				await fileStream.CopyToAsync(outputStream, cancellationToken);
			}

			if (yamlStream != null)
			{
				var safeYamlName = !string.IsNullOrWhiteSpace(yamlFileName) ? Path.GetFileName(yamlFileName) : "metadata.yaml";
				var yamlPath = Path.Combine(tempFolder, safeYamlName);
				await using var outputYaml = File.Create(yamlPath);
				await yamlStream.CopyToAsync(outputYaml, cancellationToken);
			}

			return await InspectBagAsync(tempFilePath, cancellationToken);
		}

		public async Task<RosbagInspectionReportDto> InspectBagAsync(string bagPath, CancellationToken cancellationToken = default)
		{
			var sw = System.Diagnostics.Stopwatch.StartNew();
			var (db3Path, bagDirectory, bagName) = ResolveBagPaths(bagPath);

			if (!File.Exists(db3Path))
			{
				throw new FileNotFoundException($"Không tìm thấy tệp SQLite database (.db3) của ROS2 bag tại: {db3Path}");
			}

			var fileInfo = new FileInfo(db3Path);
			var connectionString = $"Data Source={db3Path};Mode=ReadOnly;";
			await using var conn = new SqliteConnection(connectionString);
			await conn.OpenAsync(cancellationToken);

			// 1. Read topics
			var topics = await ReadTopicsAsync(conn, cancellationToken);
			if (topics.Count == 0)
			{
				throw new InvalidOperationException("Rosbag không chứa topic nào trong bảng 'topics'.");
			}

			// 2. Read and analyze messages through Pipeline
			var report = await AnalyzeMessagesPipelineAsync(conn, topics, fileInfo, bagName, db3Path, cancellationToken);
			sw.Stop();
			report.ProcessingTimeSec = Math.Round(sw.Elapsed.TotalSeconds, 2);

			return report;
		}

		private async Task<Dictionary<int, TopicMetadataDto>> ReadTopicsAsync(SqliteConnection conn, CancellationToken cancellationToken)
		{
			var topics = new Dictionary<int, TopicMetadataDto>();
			const string sql = "SELECT id, name, type, serialization_format FROM topics ORDER BY id ASC;";

			await using var cmd = new SqliteCommand(sql, conn);
			await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

			while (await reader.ReadAsync(cancellationToken))
			{
				var id = reader.GetInt32(0);
				topics[id] = new TopicMetadataDto
				{
					TopicId = id,
					TopicName = reader.GetString(1),
					TopicType = reader.GetString(2),
					SerializationFormat = reader.IsDBNull(3) ? "cdr" : reader.GetString(3)
				};
			}

			return topics;
		}

		private async Task<RosbagInspectionReportDto> AnalyzeMessagesPipelineAsync(
			SqliteConnection conn,
			Dictionary<int, TopicMetadataDto> topics,
			FileInfo fileInfo,
			string bagName,
			string db3Path,
			CancellationToken cancellationToken)
		{
			const string countSql = "SELECT COUNT(*) FROM messages;";
			await using var countCmd = new SqliteCommand(countSql, conn);
			var totalMessages = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken));

			var topicTimestamps = new Dictionary<int, List<long>>();
			var topicSizes = new Dictionary<int, long>();

			foreach (var id in topics.Keys)
			{
				topicTimestamps[id] = new List<long>();
				topicSizes[id] = 0;
			}

			long overallMinTs = long.MaxValue;
			long overallMaxTs = long.MinValue;

			// Read messages ordered by timestamp
			const string msgSql = "SELECT topic_id, timestamp, LENGTH(data) FROM messages ORDER BY timestamp ASC;";
			await using var cmd = new SqliteCommand(msgSql, conn);
			await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

			while (await reader.ReadAsync(cancellationToken))
			{
				var topicId = reader.GetInt32(0);
				var ts = reader.GetInt64(1);
				var size = reader.GetInt64(2);

				if (ts < overallMinTs) overallMinTs = ts;
				if (ts > overallMaxTs) overallMaxTs = ts;

				if (topicTimestamps.TryGetValue(topicId, out var list))
				{
					list.Add(ts);
					topicSizes[topicId] += size;
				}
			}

			if (totalMessages == 0 || overallMinTs == long.MaxValue)
			{
				overallMinTs = 0;
				overallMaxTs = 0;
			}

			double totalDurationSec = (overallMaxTs > overallMinTs)
				? (overallMaxTs - overallMinTs) / 1e9
				: 0.0;

			// Calculate per-topic statistics
			var topicDtos = new List<TopicMetadataDto>();
			foreach (var kvp in topics)
			{
				var topicId = kvp.Key;
				var meta = kvp.Value;
				var timestamps = topicTimestamps[topicId];
				meta.MessageCount = timestamps.Count;
				meta.SizeBytes = topicSizes[topicId];

				if (timestamps.Count > 0)
				{
					meta.FirstTimestampNs = timestamps[0];
					meta.LastTimestampNs = timestamps[^1];
				}

				if (timestamps.Count >= 2 && totalDurationSec > 0)
				{
					double topicDuration = (meta.LastTimestampNs - meta.FirstTimestampNs) / 1e9;
					meta.AvgFrequencyHz = topicDuration > 0
						? Math.Round((timestamps.Count - 1) / topicDuration, 2)
						: Math.Round(timestamps.Count / totalDurationSec, 2);

					var deltasMs = new List<double>(timestamps.Count - 1);
					for (int i = 1; i < timestamps.Count; i++)
					{
						deltasMs.Add((timestamps[i] - timestamps[i - 1]) / 1e6);
					}

					meta.MinDeltaTimeMs = Math.Round(deltasMs.Min(), 2);
					meta.MaxDeltaTimeMs = Math.Round(deltasMs.Max(), 2);
					meta.AvgDeltaTimeMs = Math.Round(deltasMs.Average(), 2);
				}
				else
				{
					meta.AvgFrequencyHz = 0;
				}

				topicDtos.Add(meta);
			}

			// Khởi tạo ngữ cảnh phân tích chung RosbagAnalysisContext
			var bagDir = Path.GetDirectoryName(db3Path) ?? "";
			var yamlPath = Directory.Exists(bagDir) ? Directory.GetFiles(bagDir, "*.yaml").FirstOrDefault() : null;

			var context = new RosbagAnalysisContext
			{
				Connection = conn,
				BagPath = db3Path,
				BagDirectory = bagDir,
				BagName = bagName,
				Db3Path = db3Path,
				YamlPath = yamlPath,
				FileSizeBytes = fileInfo.Length,
				TotalMessages = totalMessages,
				OverallMinTs = overallMinTs,
				OverallMaxTs = overallMaxTs,
				TotalDurationSec = totalDurationSec,
				Topics = topicDtos.ToDictionary(t => t.TopicId, t => t),
				TopicTimestamps = topicTimestamps,
				TopicSizes = topicSizes
			};

			// ================= PIPELINE CHẨN ĐOÁN 2 TẦNG =================
			// TẦNG 1: SQL Metadata Analyzers
			var dropoutTask = _topicDropoutAnalyzer.AnalyzeAsync(context, cancellationToken);
			var freqDropTask = _frequencyDropAnalyzer.AnalyzeAsync(context, cancellationToken);
			var timeSyncTask = _timestampSyncAnalyzer.AnalyzeAsync(context, cancellationToken);

			// TẦNG 2: CDR Payload Deserialization Analyzers
			var tfTask = _tfTreeIntegrityAnalyzer.AnalyzeAsync(context, cancellationToken);
			var sensorTask = _sensorPayloadAnalyzer.AnalyzeAsync(context, cancellationToken);

			await Task.WhenAll(dropoutTask, freqDropTask, timeSyncTask, tfTask, sensorTask);

			var rawAnomalies = new List<RosbagAnomalyDto>();
			rawAnomalies.AddRange(await dropoutTask);
			rawAnomalies.AddRange(await freqDropTask);
			rawAnomalies.AddRange(await timeSyncTask);
			rawAnomalies.AddRange(await tfTask);
			rawAnomalies.AddRange(await sensorTask);

			// ================= TẦNG 3: FINDING AGGREGATOR & SEVERITY RANKER =================
			var rankedAnomalies = _findingAggregator.AggregateAndRank(rawAnomalies, context);

			// Generate Timeline Buckets
			var timeline = GenerateTimelineBuckets(overallMinTs, overallMaxTs, totalDurationSec, topicTimestamps, topics);

			// Calculate Health Score
			int healthScore = CalculateHealthScore(rankedAnomalies);

			return new RosbagInspectionReportDto
			{
				BagName = bagName,
				BagPath = db3Path,
				FileSizeBytes = fileInfo.Length,
				StorageFormat = "sqlite3",
				TotalMessages = totalMessages,
				TopicCount = topics.Count,
				DurationSec = Math.Round(totalDurationSec, 2),
				HealthScore = healthScore,
				Timeline = timeline,
				Topics = topicDtos.OrderByDescending(t => t.MessageCount).ToList(),
				Anomalies = rankedAnomalies,
				TfFrames = _tfTreeIntegrityAnalyzer.ExtractedFrames
			};
		}

		private BagTimelineDto GenerateTimelineBuckets(
			long minTs,
			long maxTs,
			double durationSec,
			Dictionary<int, List<long>> topicTimestamps,
			Dictionary<int, TopicMetadataDto> topics)
		{
			var timeline = new BagTimelineDto
			{
				StartTimestampNs = minTs,
				EndTimestampNs = maxTs,
				DurationSec = Math.Round(durationSec, 2),
				StartTimeUtc = minTs > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(minTs / 1_000_000).UtcDateTime.ToString("o") : string.Empty,
				EndTimeUtc = maxTs > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(maxTs / 1_000_000).UtcDateTime.ToString("o") : string.Empty,
				Buckets = new List<TimelineBucketDto>()
			};

			if (durationSec <= 0 || minTs >= maxTs) return timeline;

			int bucketCount = Math.Clamp((int)Math.Ceiling(durationSec), 5, 60);
			double bucketSpanNs = (double)(maxTs - minTs) / bucketCount;

			var buckets = new TimelineBucketDto[bucketCount];
			for (int i = 0; i < bucketCount; i++)
			{
				buckets[i] = new TimelineBucketDto
				{
					TimeOffsetSec = Math.Round(i * (durationSec / bucketCount), 2),
					MessageCount = 0,
					TopicCounts = new Dictionary<string, int>()
				};
			}

			foreach (var (topicId, timestamps) in topicTimestamps)
			{
				var topicName = topics[topicId].TopicName;
				foreach (var ts in timestamps)
				{
					int bucketIdx = (int)((ts - minTs) / bucketSpanNs);
					if (bucketIdx >= bucketCount) bucketIdx = bucketCount - 1;
					if (bucketIdx < 0) bucketIdx = 0;

					buckets[bucketIdx].MessageCount++;
					if (!buckets[bucketIdx].TopicCounts.ContainsKey(topicName))
						buckets[bucketIdx].TopicCounts[topicName] = 0;
					buckets[bucketIdx].TopicCounts[topicName]++;
				}
			}

			timeline.Buckets = buckets.ToList();
			return timeline;
		}

		private int CalculateHealthScore(List<RosbagAnomalyDto> anomalies)
		{
			int score = 100;
			foreach (var a in anomalies)
			{
				int penalty = a.Severity.ToUpperInvariant() switch
				{
					"CRITICAL" => 25,
					"HIGH" => 15,
					"MEDIUM" => 8,
					_ => 3
				};
				score -= penalty;
			}

			return Math.Clamp(score, 0, 100);
		}

		private (string db3Path, string bagDirectory, string bagName) ResolveBagPaths(string bagPath)
		{
			var rawPath = bagPath.Trim('\"', '\'');

			if (Directory.Exists(rawPath))
			{
				var dir = new DirectoryInfo(rawPath);
				var db3 = dir.GetFiles("*.db3", SearchOption.AllDirectories).FirstOrDefault();
				if (db3 != null)
				{
					return (db3.FullName, dir.FullName, dir.Name);
				}
			}

			if (File.Exists(rawPath))
			{
				var file = new FileInfo(rawPath);
				return (file.FullName, file.DirectoryName ?? "", file.Name);
			}

			foreach (var sampleDir in GetPossibleSampleDirectories())
			{
				var combined = Path.Combine(sampleDir, rawPath);
				if (Directory.Exists(combined))
				{
					var dir = new DirectoryInfo(combined);
					var db3 = dir.GetFiles("*.db3", SearchOption.AllDirectories).FirstOrDefault();
					if (db3 != null) return (db3.FullName, dir.FullName, dir.Name);
				}

				if (File.Exists(combined))
				{
					var file = new FileInfo(combined);
					return (file.FullName, file.DirectoryName ?? "", file.Name);
				}
			}

			return (rawPath, Path.GetDirectoryName(rawPath) ?? "", Path.GetFileName(rawPath));
		}

		private List<string> GetPossibleSampleDirectories()
		{
			var list = new List<string>();

			var configured = _configuration["Rosbag:SamplesPath"];
			if (!string.IsNullOrWhiteSpace(configured))
			{
				list.Add(configured);
			}

			list.Add(@"d:\Project-VinUni\P-137\src\Data");
			list.Add(@"D:\katzensee_d\golden_benchmark_suite\scenarios\1_fault_type_scenarios");
			list.Add(@"D:\katzensee_d\golden_benchmark_suite\scenarios\2_case_benchmark_scenarios");
			list.Add(Path.Combine(AppContext.BaseDirectory, "Data"));
			list.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "src", "Data"));
			list.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Data"));

			return list.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
		}
	}
}
