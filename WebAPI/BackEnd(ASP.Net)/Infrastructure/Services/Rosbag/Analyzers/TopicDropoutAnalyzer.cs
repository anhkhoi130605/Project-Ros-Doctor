using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag.Analyzers;

namespace Infrastructure.Services.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 1: Phát hiện lỗi Loại 1 (topic_dropout).
	/// Bắt khoảng lặng (Silent Gaps) trên từng topic: Transient Dropout (2s..8s), Permanent Dropout,
	/// Intermittent Dropout, và Multi-topic Dropout đồng thời.
	/// </summary>
	public class TopicDropoutAnalyzer : ITopicDropoutAnalyzer
	{
		public Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default)
		{
			var anomalies = new List<RosbagAnomalyDto>();
			var topicDropRanges = new Dictionary<string, List<(long StartNs, long EndNs, double GapSec)>>();

			foreach (var kvp in context.Topics)
			{
				var topicId = kvp.Key;
				var meta = kvp.Value;
				if (!context.TopicTimestamps.TryGetValue(topicId, out var timestamps) || timestamps.Count < 2)
				{
					continue;
				}

				topicDropRanges[meta.TopicName] = new List<(long StartNs, long EndNs, double GapSec)>();

				// Calculate delta times
				var deltasMs = new List<double>(timestamps.Count - 1);
				for (int i = 1; i < timestamps.Count; i++)
				{
					deltasMs.Add((timestamps[i] - timestamps[i - 1]) / 1e6);
				}

				double avgDt = deltasMs.Count > 0 ? deltasMs.Average() : 0;
				if (avgDt <= 0) continue;

				double gapThresholdMs = Math.Max(avgDt * 3.0, 1000.0); // >= 3x chu kỳ hoặc >= 1.0s
				int transientCount = 0;
				var detectedGaps = new List<(int Index, double GapMs, long StartNs, long EndNs)>();

				for (int i = 0; i < deltasMs.Count; i++)
				{
					if (deltasMs[i] >= gapThresholdMs)
					{
						long startNs = timestamps[i];
						long endNs = timestamps[i + 1];
						double gapSec = deltasMs[i] / 1000.0;
						detectedGaps.Add((i, deltasMs[i], startNs, endNs));
						topicDropRanges[meta.TopicName].Add((startNs, endNs, gapSec));
					}
				}

				// 1. Transient / Intermittent Dropout
				if (detectedGaps.Count > 0)
				{
					bool isIntermittent = detectedGaps.Count >= 3;
					foreach (var gap in detectedGaps.Take(3))
					{
						transientCount++;
						double gapSec = Math.Round(gap.GapMs / 1000.0, 1);
						bool isSevere = gap.GapMs >= 3000.0;

						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = meta.TopicName,
							AnomalyType = isIntermittent ? "INTERMITTENT_DROPOUT" : "DROPPED_FRAME",
							Severity = isSevere ? "CRITICAL" : "HIGH",
							TimeRange = context.FormatRelativeRange(gap.StartNs, gap.EndNs),
							IssueTitle = isIntermittent
								? $"Mất gói ngắt quãng lặp lại ({gapSec}s)"
								: $"Khoảng lặng mất gói tin Transient Dropout ({gapSec}s)",
							Description = $"Topic {meta.TopicName} bị mất tín hiệu trong {gapSec}s (chu kỳ bình thường {Math.Round(avgDt, 1)} ms, gấp {Math.Round(gap.GapMs / avgDt, 1)}x).",
							SuggestedFix = "Kiểm tra tải mạng DDS, cấu hình QoS keep_last/transient_local, hoặc cáp kết nối vật lý cảm biến."
						});
					}
				}

				// 2. Permanent Dropout (Topic chết sớm trước khi hết bản ghi)
				double endDiffSec = (context.OverallMaxTs - meta.LastTimestampNs) / 1e9;
				if (endDiffSec > 2.0 && context.TotalDurationSec > 5.0)
				{
					anomalies.Add(new RosbagAnomalyDto
					{
						Id = Guid.NewGuid().ToString("N")[..8],
						Topic = meta.TopicName,
						AnomalyType = "TOPIC_TIMEOUT",
						Severity = "CRITICAL",
						TimeRange = context.FormatRelativeRange(meta.LastTimestampNs, context.OverallMaxTs),
						IssueTitle = $"Topic ngừng xuất bản sớm ({Math.Round(endDiffSec, 1)}s trước kết thúc file)",
						Description = $"Topic {meta.TopicName} dừng gửi tín hiệu vĩnh viễn từ giây {Math.Round(context.GetRelativeSec(meta.LastTimestampNs), 1)}s cho đến hết bản ghi ({Math.Round(endDiffSec, 1)}s im lặng).",
						SuggestedFix = "Kiểm tra node publisher có bị unhandled exception / crash hoặc đứt kết nối DDS không."
					});
				}
			}

			// 3. Multi-topic Dropout: Kiểm tra xem các topic chính (IMU & TF) có khoảng lặng trùng lặp không
			if (topicDropRanges.Count >= 2)
			{
				var topicsWithDrops = topicDropRanges.Where(kvp => kvp.Value.Count > 0).ToList();
				if (topicsWithDrops.Count >= 2)
				{
					// So khớp các khoảng thời gian mất tín hiệu giữa topic 0 và topic 1
					var first = topicsWithDrops[0];
					var second = topicsWithDrops[1];

					foreach (var gap1 in first.Value)
					{
						var match = second.Value.FirstOrDefault(gap2 =>
							Math.Max(gap1.StartNs, gap2.StartNs) < Math.Min(gap1.EndNs, gap2.EndNs));

						if (match != default)
						{
							long overlapStart = Math.Max(gap1.StartNs, match.StartNs);
							long overlapEnd = Math.Min(gap1.EndNs, match.EndNs);
							double overlapSec = Math.Round((overlapEnd - overlapStart) / 1e9, 1);

							if (overlapSec >= 1.0)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = $"{first.Key}, {second.Key}",
									AnomalyType = "MULTI_TOPIC_DROPOUT",
									Severity = "CRITICAL",
									TimeRange = context.FormatRelativeRange(overlapStart, overlapEnd),
									IssueTitle = $"Mất tín hiệu đồng thời trên nhiều topic ({overlapSec}s)",
									Description = $"Cả {first.Key} và {second.Key} đều ngừng xuất bản trong cùng khoảng thời gian {overlapSec}s. Dấu hiệu sập bus truyền thông, DDS Domain ngắt kết nối hoặc toàn bộ robot bị treo.",
									SuggestedFix = "Kiểm tra switch mạng công nghiệp, DDS Discovery, hoặc container ROS2 quản lý chung."
								});
								break;
							}
						}
					}
				}
			}

			return Task.FromResult(anomalies);
		}
	}
}
