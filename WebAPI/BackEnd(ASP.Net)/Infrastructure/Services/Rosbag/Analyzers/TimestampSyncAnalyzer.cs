using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag.Analyzers;

namespace Infrastructure.Services.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 1: Phát hiện lỗi Loại 3 (timestamp_anomaly).
	/// Bắt lỗi Out of Order (OOO) thời gian đi lùi, High Jitter (CoV > 0.30 và std >= 8ms),
	/// Lệch pha cố định Header-vs-Bag Offset (+100ms, +250ms, -150ms, +500ms), và Trôi dạt thời gian (Linear Clock Drift).
	/// </summary>
	public class TimestampSyncAnalyzer : ITimestampSyncAnalyzer
	{
		public async Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default)
		{
			var anomalies = new List<RosbagAnomalyDto>();

			// 1. Phân tích Out of Order (OOO) và Jitter trên từng topic
			foreach (var kvp in context.Topics)
			{
				var topicId = kvp.Key;
				var meta = kvp.Value;
				if (!context.TopicTimestamps.TryGetValue(topicId, out var timestamps) || timestamps.Count < 5)
				{
					continue;
				}

				// Check Out-of-Order (TIMESTAMP_INVERSION)
				int inversionCount = 0;
				long firstInversionTs = 0;
				for (int i = 1; i < timestamps.Count; i++)
				{
					if (timestamps[i] < timestamps[i - 1])
					{
						if (inversionCount == 0) firstInversionTs = timestamps[i];
						inversionCount++;
					}
				}

				if (inversionCount > 0)
				{
					anomalies.Add(new RosbagAnomalyDto
					{
						Id = Guid.NewGuid().ToString("N")[..8],
						Topic = meta.TopicName,
						AnomalyType = "TIMESTAMP_INVERSION",
						Severity = "CRITICAL",
						TimeRange = context.FormatRelativeRange(firstInversionTs, firstInversionTs),
						IssueTitle = $"Mốc thời gian bị đảo ngược Out of Order ({inversionCount} tin nhắn)",
						Description = $"Topic {meta.TopicName} chứa {inversionCount} gói tin có timestamp nhỏ hơn gói tin đến trước. Thời gian bị chạy lùi.",
						SuggestedFix = "Kiểm tra cơ chế đồng bộ đồng hồ PTP/Chrony giữa các bo mạch tính toán hoặc thread xuất bản đa luồng."
					});
				}

				// Check High Jitter (CoV > 0.30 và stdDev >= 8.0ms)
				var deltasMs = new List<double>(timestamps.Count - 1);
				for (int i = 1; i < timestamps.Count; i++)
				{
					deltasMs.Add((timestamps[i] - timestamps[i - 1]) / 1e6);
				}

				if (deltasMs.Count >= 10)
				{
					double mean = deltasMs.Average();
					double variance = deltasMs.Sum(d => Math.Pow(d - mean, 2)) / deltasMs.Count;
					double stdDev = Math.Sqrt(variance);
					double cov = mean > 0 ? stdDev / mean : 0;

					if (cov > 0.30 && stdDev >= 8.0)
					{
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = meta.TopicName,
							AnomalyType = "HIGH_JITTER",
							Severity = cov > 0.6 ? "HIGH" : "MEDIUM",
							TimeRange = context.FormatRelativeRange(meta.FirstTimestampNs, meta.LastTimestampNs),
							IssueTitle = $"Biến thiên chu kỳ gửi tin cao (Jitter CoV = {Math.Round(cov, 2)}, std = {Math.Round(stdDev, 1)}ms)",
							Description = $"Topic {meta.TopicName} có hệ số biến thiên chu kỳ CoV = {Math.Round(cov, 2)} (độ lệch chuẩn {Math.Round(stdDev, 1)} ms so với chu kỳ trung bình {Math.Round(mean, 1)} ms). Vượt ngưỡng chuẩn CoV > 0.30.",
							SuggestedFix = "Kích hoạt nhân Linux PREEMPT_RT, tăng độ ưu tiên thời gian thực (nice/chrt) cho tiến trình xuất bản cảm biến."
						});
					}
				}
			}

			// 2. Phân tích độ lệch pha Header vs Bag Timestamp & Clock Drift trên các topic chính
			await CheckHeaderVsBagTimeSyncAsync(context, anomalies, cancellationToken);

			// 3. Module đo chéo thời gian liên-topic: δ_{sync} = |t_{header_A} - t_{header_B}|
			// Nhằm phát hiện chính xác độ lệch pha tĩnh (constant_offset 100ms đến 500ms) và trôi tuyến tính (linear_drift)
			// giữa dòng dữ liệu cảm biến và cây TF
			await CheckCrossTopicTimeSyncAsync(context, anomalies, cancellationToken);

			return anomalies;
		}

		private static async Task CheckCrossTopicTimeSyncAsync(
			RosbagAnalysisContext context,
			List<RosbagAnomalyDto> anomalies,
			CancellationToken cancellationToken)
		{
			// Tìm topic cảm biến (Sensor Topics)
			var sensorTopics = context.Topics.Values
				.Where(t => t.TopicType == "sensor_msgs/msg/Imu" ||
				            t.TopicType == "sensor_msgs/msg/PointCloud2" ||
				            t.TopicType == "sensor_msgs/msg/LaserScan" ||
				            t.TopicType == "nav_msgs/msg/Odometry" ||
				            t.TopicName.Contains("imu", StringComparison.OrdinalIgnoreCase) ||
				            t.TopicName.Contains("lidar", StringComparison.OrdinalIgnoreCase) ||
				            t.TopicName.Contains("odom", StringComparison.OrdinalIgnoreCase))
				.ToList();

			// Tìm topic cây tọa độ TF
			var tfTopics = context.Topics.Values
				.Where(t => t.TopicName == "/tf" || t.TopicName == "tf" ||
				            t.TopicName == "/tf_static" || t.TopicName == "tf_static" ||
				            t.TopicType == "tf2_msgs/msg/TFMessage")
				.ToList();

			if (sensorTopics.Count == 0 || tfTopics.Count == 0) return;

			var tfTopic = tfTopics.First();

			// Đọc các mốc header.stamp từ topic TF: danh sách (BagTs, HeaderTs)
			var tfHeaderStamps = await ExtractHeaderTimestampsAsync(context, tfTopic, isTf: true, cancellationToken);
			if (tfHeaderStamps.Count < 5) return;

			// Lặp qua từng sensor topic để thực hiện đo chéo δ_sync = |t_header_A - t_header_B|
			foreach (var sensorTopic in sensorTopics)
			{
				// Tránh trùng lặp nếu topic đã có kết luận lỗi tương đương
				bool alreadyHasOffset = anomalies.Any(a => a.Topic == sensorTopic.TopicName && a.AnomalyType == "TIMESTAMP_OFFSET");
				bool alreadyHasDrift = anomalies.Any(a => a.Topic == sensorTopic.TopicName && a.AnomalyType == "CLOCK_DRIFT");
				if (alreadyHasOffset && alreadyHasDrift) continue;

				var sensorHeaderStamps = await ExtractHeaderTimestampsAsync(context, sensorTopic, isTf: false, cancellationToken);
				if (sensorHeaderStamps.Count < 5) continue;

				// Ghép cặp Sensor và TF dựa trên bag timestamp gần nhau nhất (within ±300ms)
				var pairedDeltas = new List<(long BagTs, double DeltaSyncMs)>();

				int tfIndex = 0;
				foreach (var s in sensorHeaderStamps)
				{
					while (tfIndex < tfHeaderStamps.Count - 1 &&
					       Math.Abs(tfHeaderStamps[tfIndex + 1].BagTs - s.BagTs) < Math.Abs(tfHeaderStamps[tfIndex].BagTs - s.BagTs))
					{
						tfIndex++;
					}

					var bestTf = tfHeaderStamps[tfIndex];
					long bagDiffNs = Math.Abs(bestTf.BagTs - s.BagTs);
					if (bagDiffNs <= 300_000_000L)
					{
						// δ_sync = (t_header_A - t_header_B) / 1e6 (ms)
						double deltaSyncMs = (s.HeaderTs - bestTf.HeaderTs) / 1e6;
						pairedDeltas.Add((s.BagTs, deltaSyncMs));
					}
				}

				if (pairedDeltas.Count < 5) continue;

				long startNs = pairedDeltas.First().BagTs;
				long endNs = pairedDeltas.Last().BagTs;
				double durationSec = (endNs - startNs) / 1e9;

				double firstDelta = pairedDeltas.Take(5).Average(p => p.DeltaSyncMs);
				double lastDelta = pairedDeltas.TakeLast(5).Average(p => p.DeltaSyncMs);
				double diffDelta = Math.Abs(lastDelta - firstDelta);

				// 1. Kiểm tra Trôi tuyến tính (Linear Clock Drift)
				if (!alreadyHasDrift && diffDelta >= 25.0 && durationSec >= 5.0)
				{
					double driftRatePerSec = Math.Round(diffDelta / durationSec, 2);
					anomalies.Add(new RosbagAnomalyDto
					{
						Id = Guid.NewGuid().ToString("N")[..8],
						Topic = sensorTopic.TopicName,
						AnomalyType = "CLOCK_DRIFT",
						Severity = "CRITICAL",
						TimeRange = context.FormatRelativeRange(startNs, endNs),
						IssueTitle = $"Trôi dạt thời gian liên-topic Sensor vs TF Linear Clock Drift (~{driftRatePerSec} ms/s)",
						Description = $"Đo chéo thời gian liên-topic δ_sync = |t_header_A - t_header_B| giữa '{sensorTopic.TopicName}' và '{tfTopic.TopicName}' phát hiện trôi dạt tuyến tính từ {Math.Round(firstDelta, 1)} ms đến {Math.Round(lastDelta, 1)} ms (tốc độ trôi ~{driftRatePerSec} ms/giây).",
						SuggestedFix = "Triển khai Chrony hoặc phần cứng PTP IEEE 1588 để đồng bộ xung nhịp giữa sensor master clock và robot host CPU."
					});
				}
				// 2. Kiểm tra Độ lệch pha tĩnh (Constant Offset từ 100ms đến 500ms)
				else if (!alreadyHasOffset)
				{
					var absDeltas = pairedDeltas.Select(p => Math.Abs(p.DeltaSyncMs)).ToList();
					double meanAbsDelta = absDeltas.Average();

					double variance = absDeltas.Sum(d => Math.Pow(d - meanAbsDelta, 2)) / absDeltas.Count;
					double stdDev = Math.Sqrt(variance);

					// Độ lệch pha tĩnh trong khoảng 100ms - 500ms (dung sai 80ms - 650ms, stdDev nhỏ <= 40ms)
					if (meanAbsDelta >= 80.0 && meanAbsDelta <= 650.0 && stdDev <= 40.0)
					{
						double avgSignedOffset = Math.Round(pairedDeltas.Average(p => p.DeltaSyncMs), 1);
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = sensorTopic.TopicName,
							AnomalyType = "TIMESTAMP_OFFSET",
							Severity = Math.Abs(avgSignedOffset) >= 200 ? "CRITICAL" : "HIGH",
							TimeRange = context.FormatRelativeRange(startNs, endNs),
							IssueTitle = $"Lệch pha thời gian tĩnh liên-topic giữa {sensorTopic.TopicName} và TF ({avgSignedOffset} ms)",
							Description = $"Đo chéo thời gian liên-topic δ_sync = |t_header_A - t_header_B| phát hiện độ lệch pha tĩnh {avgSignedOffset} ms (trong dải 100ms - 500ms) giữa dòng cảm biến '{sensorTopic.TopicName}' và cây TF. Độ lệch chuẩn {Math.Round(stdDev, 1)} ms rất nhỏ khẳng định lệch pha tĩnh.",
							SuggestedFix = "Hiệu chuẩn time_offset và timestamp latency compensation trong ROS 2 sensor driver hoặc TF broadcaster node."
						});
					}
				}
			}
		}

		private static async Task<List<(long BagTs, long HeaderTs)>> ExtractHeaderTimestampsAsync(
			RosbagAnalysisContext context,
			TopicMetadataDto topic,
			bool isTf,
			CancellationToken cancellationToken)
		{
			var list = new List<(long BagTs, long HeaderTs)>();
			try
			{
				const string sql = "SELECT timestamp, data FROM messages WHERE topic_id = @tid ORDER BY timestamp ASC;";
				await using var cmd = new SqliteCommand(sql, (SqliteConnection)context.Connection);
				cmd.Parameters.AddWithValue("@tid", topic.TopicId);
				await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

				while (await reader.ReadAsync(cancellationToken))
				{
					var bagTs = reader.GetInt64(0);
					if (reader.IsDBNull(1)) continue;
					var raw = (byte[])reader.GetValue(1);
					if (raw.Length < 16) continue;

					long hdrTs = 0;
					if (isTf)
					{
						if (raw.Length >= 16)
						{
							uint count = BitConverter.ToUInt32(raw, 4);
							if (count > 0 && raw.Length >= 16)
							{
								int sec = BitConverter.ToInt32(raw, 8);
								uint nsec = BitConverter.ToUInt32(raw, 12);
								hdrTs = (long)sec * 1_000_000_000L + (long)nsec;
							}
						}
					}
					else
					{
						int sec = BitConverter.ToInt32(raw, 4);
						uint nsec = BitConverter.ToUInt32(raw, 8);
						hdrTs = (long)sec * 1_000_000_000L + (long)nsec;
					}

					if (hdrTs > 0)
					{
						list.Add((bagTs, hdrTs));
					}
				}
			}
			catch
			{
				// Bỏ qua lỗi format nhị phân
			}

			return list;
		}

		private static async Task CheckHeaderVsBagTimeSyncAsync(
			RosbagAnalysisContext context,
			List<RosbagAnomalyDto> anomalies,
			CancellationToken cancellationToken)
		{
			// Kiểm tra trên topic IMU và TF
			var candidateTopics = context.Topics.Values
				.Where(t => t.TopicName == "/tf" || t.TopicName == "tf" ||
				            t.TopicType == "sensor_msgs/msg/Imu" || t.TopicName.Contains("imu", StringComparison.OrdinalIgnoreCase))
				.ToList();

			foreach (var topic in candidateTopics)
			{
				try
				{
					const string sql = "SELECT timestamp, data FROM messages WHERE topic_id = @tid ORDER BY timestamp ASC;";
					await using var cmd = new SqliteCommand(sql, (SqliteConnection)context.Connection);
					cmd.Parameters.AddWithValue("@tid", topic.TopicId);
					await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

					var diffs = new List<(long BagTs, double DiffMs)>();
					bool isTf = topic.TopicName.Contains("tf", StringComparison.OrdinalIgnoreCase);

					while (await reader.ReadAsync(cancellationToken))
					{
						var bagTs = reader.GetInt64(0);
						if (reader.IsDBNull(1)) continue;
						var raw = (byte[])reader.GetValue(1);
						if (raw.Length < 16) continue;

						long hdrTs = 0;
						if (isTf)
						{
							// tf2_msgs/msg/TFMessage: 4 bytes CDR header, 4 bytes sequence count, then TransformStamped header
							if (raw.Length >= 16)
							{
								uint count = BitConverter.ToUInt32(raw, 4);
								if (count > 0 && raw.Length >= 16)
								{
									int sec = BitConverter.ToInt32(raw, 8);
									uint nsec = BitConverter.ToUInt32(raw, 12);
									hdrTs = (long)sec * 1_000_000_000L + (long)nsec;
								}
							}
						}
						else
						{
							// sensor_msgs/msg/Imu: 4 bytes CDR header, 4 bytes sec, 4 bytes nsec
							int sec = BitConverter.ToInt32(raw, 4);
							uint nsec = BitConverter.ToUInt32(raw, 8);
							hdrTs = (long)sec * 1_000_000_000L + (long)nsec;
						}

						if (hdrTs > 0)
						{
							double diffMs = (hdrTs - bagTs) / 1e6;
							diffs.Add((bagTs, diffMs));
						}
					}

					if (diffs.Count < 5) continue;

					// Phân tích xem có độ lệch lớn (offset) hoặc trôi thời gian (drift)
					var significantDiffs = diffs.Where(d => Math.Abs(d.DiffMs) >= 40.0).ToList();
					if (significantDiffs.Count >= 5)
					{
						double firstDiff = significantDiffs.First().DiffMs;
						double lastDiff = significantDiffs.Last().DiffMs;
						double diffDelta = Math.Abs(lastDiff - firstDiff);
						long startNs = significantDiffs.First().BagTs;
						long endNs = significantDiffs.Last().BagTs;
						double durationSec = (endNs - startNs) / 1e9;

						// Nếu diff thay đổi đáng kể theo thời gian (> 30ms trong suốt quá trình) -> Linear Clock Drift
						if (diffDelta >= 30.0 && durationSec >= 5.0)
						{
							double driftRatePerSec = Math.Round(diffDelta / durationSec, 1);
							anomalies.Add(new RosbagAnomalyDto
							{
								Id = Guid.NewGuid().ToString("N")[..8],
								Topic = topic.TopicName,
								AnomalyType = "CLOCK_DRIFT",
								Severity = "CRITICAL",
								TimeRange = context.FormatRelativeRange(startNs, endNs),
								IssueTitle = $"Trôi dạt đồng hồ tuyến tính Linear Clock Drift (~{driftRatePerSec} ms/s)",
								Description = $"Độ lệch giữa mốc thời gian phát hành (header.stamp) và mốc ghi nhận tăng dần từ {Math.Round(firstDiff, 1)} ms đến {Math.Round(lastDiff, 1)} ms (tốc độ trôi ~{driftRatePerSec} ms/giây).",
								SuggestedFix = "Triển khai Chrony hoặc phần cứng PTP IEEE 1588 để đồng bộ xung nhịp giữa sensor master clock và robot host clock."
							});
						}
						else
						{
							// Lệch pha cố định Constant Offset (+100ms, +250ms, -150ms, +500ms)
							double avgOffset = Math.Round(significantDiffs.Average(d => d.DiffMs), 1);
							anomalies.Add(new RosbagAnomalyDto
							{
								Id = Guid.NewGuid().ToString("N")[..8],
								Topic = topic.TopicName,
								AnomalyType = "TIMESTAMP_OFFSET",
								Severity = Math.Abs(avgOffset) >= 200 ? "CRITICAL" : "HIGH",
								TimeRange = context.FormatRelativeRange(startNs, endNs),
								IssueTitle = $"Lệch pha thời gian cố định Header vs Bag ({avgOffset} ms)",
								Description = $"Topic {topic.TopicName} duy trì độ lệch thời gian cố định {avgOffset} ms so với receive timestamp. Dấu hiệu lệch múi giờ, clock offset chưa hiệu chuẩn, hoặc trễ đóng gói định kỳ.",
								SuggestedFix = "Hiệu chuẩn time-offset offset trong driver ROS2 trước khi publish vào pipeline fusion EKF/Nav2."
							});
						}
					}
				}
				catch
				{
					// Bỏ qua nếu có lỗi định dạng nhị phân không tương thích
				}
			}
		}
	}
}
