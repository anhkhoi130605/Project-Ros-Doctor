using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Rosbag
{
	public class RosbagInspectorService : IRosbagInspectorService
	{
		private readonly IConfiguration _configuration;
		private readonly ILogger<RosbagInspectorService> _logger;

		public RosbagInspectorService(IConfiguration configuration, ILogger<RosbagInspectorService> logger)
		{
			_configuration = configuration;
			_logger = logger;
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

		public async Task<RosbagInspectionReportDto> InspectUploadedFileAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default)
		{
			var tempFolder = Path.Combine(Path.GetTempPath(), "rosbags_upload", Guid.NewGuid().ToString("N")[..8]);
			Directory.CreateDirectory(tempFolder);

			var tempFilePath = Path.Combine(tempFolder, fileName);
			await using (var outputStream = File.Create(tempFilePath))
			{
				await fileStream.CopyToAsync(outputStream, cancellationToken);
			}

			return await InspectBagAsync(tempFilePath, cancellationToken);
		}

		public async Task<RosbagInspectionReportDto> InspectBagAsync(string bagPath, CancellationToken cancellationToken = default)
		{
			var (db3Path, bagDirectory, bagName) = ResolveBagPaths(bagPath);

			if (!File.Exists(db3Path))
			{
				throw new FileNotFoundException($"Không tìm thấy tệp SQLite database (.db3) của ROS2 bag tại: {db3Path}");
			}

			var fileInfo = new FileInfo(db3Path);
			long totalSizeBytes = fileInfo.Length;

			var connectionString = $"Data Source={db3Path};Mode=ReadOnly;";
			await using var conn = new SqliteConnection(connectionString);
			await conn.OpenAsync(cancellationToken);

			// 1. Read topics
			var topics = await ReadTopicsAsync(conn, cancellationToken);
			if (topics.Count == 0)
			{
				throw new InvalidOperationException("Rosbag không chứa topic nào trong bảng 'topics'.");
			}

			// 2. Read and analyze messages
			var report = await AnalyzeMessagesAsync(conn, topics, fileInfo, bagName, db3Path, cancellationToken);

			return report;
		}

		private async Task<Dictionary<int, TopicMetadata>> ReadTopicsAsync(SqliteConnection conn, CancellationToken cancellationToken)
		{
			var topics = new Dictionary<int, TopicMetadata>();
			const string sql = "SELECT id, name, type, serialization_format FROM topics ORDER BY id ASC;";

			await using var cmd = new SqliteCommand(sql, conn);
			await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

			while (await reader.ReadAsync(cancellationToken))
			{
				var id = reader.GetInt32(0);
				var name = reader.GetString(1);
				var type = reader.GetString(2);
				var format = reader.IsDBNull(3) ? "cdr" : reader.GetString(3);

				topics[id] = new TopicMetadata
				{
					TopicId = id,
					TopicName = name,
					TopicType = type,
					SerializationFormat = format,
					MessageCount = 0,
					SizeBytes = 0
				};
			}

			return topics;
		}

		private async Task<RosbagInspectionReportDto> AnalyzeMessagesAsync(
			SqliteConnection conn,
			Dictionary<int, TopicMetadata> topics,
			FileInfo fileInfo,
			string bagName,
			string db3Path,
			CancellationToken cancellationToken)
		{
			const string countSql = "SELECT COUNT(*) FROM messages;";
			await using var countCmd = new SqliteCommand(countSql, conn);
			var totalMessages = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken));

			var anomalies = new List<RosbagAnomalyDto>();
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

			long lastGlobalTs = 0;
			int inversionCount = 0;
			int emptyPayloadCount = 0;

			while (await reader.ReadAsync(cancellationToken))
			{
				var topicId = reader.GetInt32(0);
				var ts = reader.GetInt64(1);
				var size = reader.GetInt64(2);

				if (ts < overallMinTs) overallMinTs = ts;
				if (ts > overallMaxTs) overallMaxTs = ts;

				// Anomaly check: Timestamp inversion (đi lùi thời gian)
				if (lastGlobalTs > 0 && ts < lastGlobalTs)
				{
					inversionCount++;
					if (inversionCount <= 5)
					{
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = topics.TryGetValue(topicId, out var t) ? t.TopicName : $"ID {topicId}",
							AnomalyType = "TIMESTAMP_INVERSION",
							Severity = "CRITICAL",
							TimeRange = FormatTimestampRange(ts, lastGlobalTs),
							IssueTitle = "Mốc thời gian bị đảo ngược (Timestamp Inversion)",
							Description = $"Phát hiện message có timestamp {ts} nhỏ hơn message trước đó {lastGlobalTs}.",
							SuggestedFix = "Kiểm tra đồng bộ đồng hồ phần cứng (PTP/Chrony) hoặc cảm biến bị lệch clock."
						});
					}
				}
				lastGlobalTs = ts;

				// Anomaly check: Empty payload
				if (size <= 0)
				{
					emptyPayloadCount++;
					if (emptyPayloadCount <= 5)
					{
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = topics.TryGetValue(topicId, out var t) ? t.TopicName : $"ID {topicId}",
							AnomalyType = "EMPTY_PAYLOAD",
							Severity = "HIGH",
							TimeRange = FormatTimestampNs(ts),
							IssueTitle = "Gói tin rỗng (Empty / Zero-byte Payload)",
							Description = $"Message thuộc topic {topics[topicId].TopicName} có kích thước 0 bytes.",
							SuggestedFix = "Kiểm tra driver cảm biến xuất bản dữ liệu rỗng hoặc lỗi tuần tự hóa CDR."
						});
					}
				}

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

			// Analyze per-topic stats and frequency anomalies
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

					// Calculate delta times
					var deltasMs = new List<double>(timestamps.Count - 1);
					for (int i = 1; i < timestamps.Count; i++)
					{
						var dt = (timestamps[i] - timestamps[i - 1]) / 1e6; // ns to ms
						deltasMs.Add(dt);
					}

					meta.MinDeltaTimeMs = Math.Round(deltasMs.Min(), 2);
					meta.MaxDeltaTimeMs = Math.Round(deltasMs.Max(), 2);
					meta.AvgDeltaTimeMs = Math.Round(deltasMs.Average(), 2);

					// Check for dropped frames / severe jitter
					var avgDt = meta.AvgDeltaTimeMs;
					var droppedThreshold = Math.Max(avgDt * 3.0, 1000.0); // > 3x average or > 1 second
					int dropCount = 0;

					for (int i = 0; i < deltasMs.Count; i++)
					{
						if (deltasMs[i] > droppedThreshold)
						{
							dropCount++;
							if (dropCount <= 3)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = meta.TopicName,
									AnomalyType = "DROPPED_FRAME",
									Severity = deltasMs[i] > 3000 ? "HIGH" : "MEDIUM",
									TimeRange = FormatTimestampRange(timestamps[i], timestamps[i + 1]),
									IssueTitle = $"Trễ chu kỳ / Rớt gói tin ({Math.Round(deltasMs[i], 1)} ms)",
									Description = $"Khoảng cách giữa 2 tin nhắn liên tiếp đạt {Math.Round(deltasMs[i], 1)} ms, cao hơn nhiều so với chu kỳ trung bình {Math.Round(avgDt, 1)} ms.",
									SuggestedFix = "Kiểm tra tải CPU, QoS depth hoặc băng thông mạng truyền cảm biến."
								});
							}
						}
					}

					// Check topic early dropout (Topic chết sớm trước khi hết rosbag)
					double endDiffSec = (overallMaxTs - meta.LastTimestampNs) / 1e9;
					if (endDiffSec > 2.0 && totalDurationSec > 5.0)
					{
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = meta.TopicName,
							AnomalyType = "TOPIC_TIMEOUT",
							Severity = "HIGH",
							TimeRange = FormatTimestampRange(meta.LastTimestampNs, overallMaxTs),
							IssueTitle = "Mất tín hiệu cảm biến sớm (Topic Dropout)",
							Description = $"Topic {meta.TopicName} ngừng gửi dữ liệu trước khi kết thúc bản ghi {Math.Round(endDiffSec, 1)} giây.",
							SuggestedFix = "Kiểm tra node publisher có bị crash hoặc ngắt kết nối giữa chừng không."
						});
					}
				}
				else if (timestamps.Count == 1 && totalDurationSec > 3.0)
				{
					meta.AvgFrequencyHz = 0;
					anomalies.Add(new RosbagAnomalyDto
					{
						Id = Guid.NewGuid().ToString("N")[..8],
						Topic = meta.TopicName,
						AnomalyType = "INSUFFICIENT_DATA",
						Severity = "LOW",
						TimeRange = FormatTimestampNs(timestamps[0]),
						IssueTitle = "Topic chỉ có 1 message duy nhất",
						Description = $"Topic {meta.TopicName} chỉ xuất bản 1 tin nhắn duy nhất trong toàn bộ {Math.Round(totalDurationSec, 1)}s.",
						SuggestedFix = "Xác nhận xem topic này là dạng cấu hình tĩnh (latched topic) hay bị treo."
					});
				}
				else
				{
					meta.AvgFrequencyHz = 0;
				}

				topicDtos.Add(new TopicMetadataDto
				{
					TopicId = meta.TopicId,
					TopicName = meta.TopicName,
					TopicType = meta.TopicType,
					SerializationFormat = meta.SerializationFormat,
					MessageCount = meta.MessageCount,
					SizeBytes = meta.SizeBytes,
					AvgFrequencyHz = meta.AvgFrequencyHz,
					MinDeltaTimeMs = meta.MinDeltaTimeMs,
					MaxDeltaTimeMs = meta.MaxDeltaTimeMs,
					AvgDeltaTimeMs = meta.AvgDeltaTimeMs,
					FirstTimestampNs = meta.FirstTimestampNs,
					LastTimestampNs = meta.LastTimestampNs
				});
			}

			// Generate Timeline Buckets (chia timeline thành các khoảng 1s hoặc tương ứng)
			var timeline = GenerateTimelineBuckets(overallMinTs, overallMaxTs, totalDurationSec, topicTimestamps, topics);

			// Calculate Health Score
			int healthScore = CalculateHealthScore(anomalies);

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
				Anomalies = anomalies
			};
		}

		private BagTimelineDto GenerateTimelineBuckets(
			long minTs,
			long maxTs,
			double durationSec,
			Dictionary<int, List<long>> topicTimestamps,
			Dictionary<int, TopicMetadata> topics)
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

			// Bucket count: 1 second per bucket, or min 10, max 60 buckets
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

			// If rawPath is a directory
			if (Directory.Exists(rawPath))
			{
				var dir = new DirectoryInfo(rawPath);
				var db3 = dir.GetFiles("*.db3", SearchOption.AllDirectories).FirstOrDefault();
				if (db3 != null)
				{
					return (db3.FullName, dir.FullName, dir.Name);
				}
			}

			// If rawPath is directly a file
			if (File.Exists(rawPath))
			{
				var file = new FileInfo(rawPath);
				return (file.FullName, file.DirectoryName ?? "", file.Name);
			}

			// Try relative to sample paths
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

			// Standard paths relative to workspace
			list.Add(@"d:\Project-VinUni\P-137\src\Data");
			list.Add(Path.Combine(AppContext.BaseDirectory, "Data"));
			list.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "src", "Data"));
			list.Add(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Data"));

			return list.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
		}

		private static string FormatTimestampNs(long ns)
		{
			if (ns <= 0) return "0s";
			var dt = DateTimeOffset.FromUnixTimeMilliseconds(ns / 1_000_000);
			return dt.ToString("HH:mm:ss.fff");
		}

		private static string FormatTimestampRange(long startNs, long endNs)
		{
			return $"{FormatTimestampNs(startNs)} -> {FormatTimestampNs(endNs)}";
		}
	}
}
