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
	/// TẦNG 1: Phát hiện lỗi Loại 2 (frequency_drop).
	/// Đo đạc tần số rolling window, so khớp nominal_hz (P80), gạt bỏ cửa sổ đuôi cộc (< 0.8 * windowSec)
	/// để triệt tiêu lỗi ảo 84-93% ở giây 85, gom nhóm drop incidents, phát hiện gradual degradation và burst loss.
	/// </summary>
	public class FrequencyDropAnalyzer : IFrequencyDropAnalyzer
	{
		public Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default)
		{
			var anomalies = new List<RosbagAnomalyDto>();

			foreach (var kvp in context.Topics)
			{
				var topicId = kvp.Key;
				var meta = kvp.Value;
				if (!context.TopicTimestamps.TryGetValue(topicId, out var timestamps) || timestamps.Count < 10)
				{
					continue;
				}

				double topicDuration = (meta.LastTimestampNs - meta.FirstTimestampNs) / 1e9;
				if (topicDuration < 3.0 || meta.AvgFrequencyHz < 1.0)
				{
					continue;
				}

				// Calculate delta times
				var deltasMs = new List<double>(timestamps.Count - 1);
				for (int i = 1; i < timestamps.Count; i++)
				{
					deltasMs.Add((timestamps[i] - timestamps[i - 1]) / 1e6);
				}
				double avgDt = deltasMs.Count > 0 ? deltasMs.Average() : 0;

				// 1. Sliding window frequency analysis
				double windowSec = Math.Min(5.0, Math.Max(2.0, topicDuration / 10.0));
				long windowNs = (long)(windowSec * 1e9);
				long windowStart = meta.FirstTimestampNs;
				int tsIdx = 0;
				int windowIndex = 0;
				var windowRates = new List<(int Index, double Hz, long StartNs, long EndNs)>();

				while (windowStart < meta.LastTimestampNs)
				{
					long windowEnd = windowStart + windowNs;
					long effectiveEndNs = Math.Min(windowEnd, meta.LastTimestampNs);
					double effectiveSec = (effectiveEndNs - windowStart) / 1e9;

					// QUY TẮC CẢI TIẾN BẮT BUỘC: Gạt bỏ cửa sổ đuôi cộc (< 0.8 * windowSec hoặc < 2.0s)
					// Triệt tiêu hoàn toàn lỗi rớt 84% - 93% ảo ở giây cuối file
					if (effectiveSec < Math.Min(2.0, windowSec * 0.8))
					{
						break;
					}

					int countInWindow = 0;
					int localIdx = tsIdx;
					while (localIdx < timestamps.Count && timestamps[localIdx] < windowEnd)
					{
						if (timestamps[localIdx] >= windowStart) countInWindow++;
						localIdx++;
					}
					tsIdx = localIdx > 0 ? localIdx - 1 : 0;

					double windowHz = countInWindow / effectiveSec;
					windowRates.Add((windowIndex, windowHz, windowStart, effectiveEndNs));
					windowStart = windowEnd;
					windowIndex++;
				}

				// Ước tính tần số danh định (nominalHz) từ phân vị 80% (P80)
				double nominalHz = meta.AvgFrequencyHz;
				if (windowRates.Count > 0)
				{
					var sortedHz = windowRates.Select(w => w.Hz).OrderBy(h => h).ToList();
					int p80Idx = (int)Math.Min(sortedHz.Count - 1, Math.Floor(sortedHz.Count * 0.8));
					nominalHz = Math.Max(meta.AvgFrequencyHz, Math.Round(sortedHz[p80Idx], 1));
				}

				// Gom nhóm các cửa sổ sụt giảm liên tiếp thành sự cố sự vụ (Consolidated Incident)
				var dropIncidents = new List<(long StartNs, long EndNs, List<double> Rates, double MaxDropPct)>();
				long incStartNs = 0;
				long incEndNs = 0;
				var incRates = new List<double>();
				double incMaxDrop = 0;

				foreach (var w in windowRates)
				{
					double dropPct = nominalHz > 0 ? (nominalHz - w.Hz) / nominalHz * 100 : 0;
					// Ngưỡng phát hiện: giảm >= 15% (bao quát từ mild 15%, 25% đến extreme 90%)
					if (dropPct >= 15.0)
					{
						if (incRates.Count == 0)
						{
							incStartNs = w.StartNs;
							incEndNs = w.EndNs;
							incRates.Add(w.Hz);
							incMaxDrop = dropPct;
						}
						else
						{
							incEndNs = w.EndNs;
							incRates.Add(w.Hz);
							if (dropPct > incMaxDrop) incMaxDrop = dropPct;
						}
					}
					else
					{
						if (incRates.Count > 0)
						{
							dropIncidents.Add((incStartNs, incEndNs, new List<double>(incRates), incMaxDrop));
							incRates.Clear();
						}
					}
				}
				if (incRates.Count > 0)
				{
					dropIncidents.Add((incStartNs, incEndNs, new List<double>(incRates), incMaxDrop));
				}

				// P3: Gạt bỏ sự cố cuối file (tail incident) — false positive do sliding window taper tự nhiên.
				// Điều kiện lọc:
				//   - EndNs của incident nằm trong vòng 2 × windowNs tính từ cuối file (vùng "tail zone")
				//   - Mức giảm < 40% (chỉ Mild/Moderate) — giữ nguyên drop nghiêm trọng >= 40%
				dropIncidents = dropIncidents
					.Where(inc =>
					{
						bool inTailZone = (meta.LastTimestampNs - inc.EndNs) < windowNs * 2.0;
						bool isMild = inc.MaxDropPct < 40.0;
						return !(inTailZone && isMild);
					})
					.ToList();

				foreach (var inc in dropIncidents.Take(3))
				{
					double avgObservedHz = Math.Round(inc.Rates.Average(), 1);
					double dropPct = Math.Round(inc.MaxDropPct, 0);
					double durSec = Math.Round((inc.EndNs - inc.StartNs) / 1e9, 1);
					double relStartSec = Math.Round(context.GetRelativeSec(inc.StartNs), 1);
					double relEndSec = Math.Round(context.GetRelativeSec(inc.EndNs), 1);

					string severity = dropPct >= 60 ? "CRITICAL" : (dropPct >= 35 ? "HIGH" : "MEDIUM");
					string severityLabel = dropPct >= 75 ? "Extreme" : (dropPct >= 40 ? "Moderate/Severe" : "Mild");

					anomalies.Add(new RosbagAnomalyDto
					{
						Id = Guid.NewGuid().ToString("N")[..8],
						Topic = meta.TopicName,
						AnomalyType = "FREQUENCY_DROP",
						Severity = severity,
						TimeRange = context.FormatRelativeRange(inc.StartNs, inc.EndNs),
						IssueTitle = $"Sụt giảm tần số {severityLabel} {dropPct}% trên topic {meta.TopicName} ({relStartSec}s - {relEndSec}s)",
						Description = $"Topic {meta.TopicName} bị sụt giảm tần số trong khoảng {relStartSec}s - {relEndSec}s ({durSec}s). Tần số quan sát trung bình {avgObservedHz} Hz so với tần số danh định {Math.Round(nominalHz, 1)} Hz (sụt giảm {dropPct}%).",
						SuggestedFix = "Nâng cấp lên MultiThreadedExecutor, mở rộng độ sâu hàng đợi QoS (keep_last 100) hoặc kiểm tra xung đột executor starvation."
					});
				}

				// 2. Gradual Linear Degradation: Tần số nửa sau < 70% nửa đầu
				if (windowRates.Count >= 4)
				{
					int half = windowRates.Count / 2;
					double firstHalfAvgHz = windowRates.Take(half).Average(w => w.Hz);
					double secondHalfAvgHz = windowRates.Skip(half).Average(w => w.Hz);

					if (firstHalfAvgHz > 1 && secondHalfAvgHz < firstHalfAvgHz * 0.70)
					{
						double degradePct = (firstHalfAvgHz - secondHalfAvgHz) / firstHalfAvgHz * 100;
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = meta.TopicName,
							AnomalyType = "GRADUAL_DEGRADATION",
							Severity = "HIGH",
							TimeRange = context.FormatRelativeRange(meta.FirstTimestampNs, meta.LastTimestampNs),
							IssueTitle = $"Suy thoái tần số dần dần ({Math.Round(degradePct, 0)}%)",
							Description = $"Tần số xuất bản giảm dần theo thời gian: nửa đầu bản ghi đạt {Math.Round(firstHalfAvgHz, 1)} Hz, nửa sau chỉ còn {Math.Round(secondHalfAvgHz, 1)} Hz (suy giảm {Math.Round(degradePct, 0)}%).",
							SuggestedFix = "Nghi ngờ rò rỉ bộ nhớ (memory leak), quá nhiệt CPU throttling, hoặc nghẽn thread tích tụ."
						});
					}
				}

				// 3. Burst Loss: >= 3 khoảng trễ liên tiếp vượt 1.8x trung bình
				if (deltasMs.Count >= 3 && avgDt > 0)
				{
					int consecutiveDrops = 0;
					int burstStart = 0;
					int burstReported = 0;

					for (int i = 0; i < deltasMs.Count; i++)
					{
						if (deltasMs[i] > avgDt * 1.8)
						{
							if (consecutiveDrops == 0) burstStart = i;
							consecutiveDrops++;
						}
						else
						{
							if (consecutiveDrops >= 3 && burstReported < 2)
							{
								burstReported++;
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = meta.TopicName,
									AnomalyType = "BURST_LOSS",
									Severity = consecutiveDrops >= 5 ? "HIGH" : "MEDIUM",
									TimeRange = context.FormatRelativeRange(timestamps[burstStart], timestamps[Math.Min(i, timestamps.Count - 1)]),
									IssueTitle = $"Mất gói hàng loạt Burst Loss ({consecutiveDrops} chu kỳ liên tiếp)",
									Description = $"Phát hiện {consecutiveDrops} khoảng trễ liên tiếp vượt 1.8x chu kỳ danh định, cho thấy node hoặc mạng bị nghẽn đột ngột.",
									SuggestedFix = "Kiểm tra log /rosout, tải CPU trong khung giờ này hoặc hiện tượng rớt mạng DDS."
								});
							}
							consecutiveDrops = 0;
						}
					}
				}
			}

			return Task.FromResult(anomalies);
		}
	}
}
