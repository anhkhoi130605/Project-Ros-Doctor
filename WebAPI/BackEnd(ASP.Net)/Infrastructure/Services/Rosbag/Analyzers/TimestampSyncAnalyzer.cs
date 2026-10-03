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

			return anomalies;
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
