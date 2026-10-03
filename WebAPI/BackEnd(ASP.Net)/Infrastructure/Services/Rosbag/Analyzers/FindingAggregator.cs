using System;
using System.Collections.Generic;
using System.Linq;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag.Analyzers;

namespace Infrastructure.Services.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 3: Tổng hợp, khử trùng lặp (dedup), lọc nhiễu và xếp hạng ưu tiên theo phân cấp:
	/// Priority: NODE_CRASH >= TF_TREE_BROKEN > SENSOR_OUTLIER > TOPIC_DROPOUT > TIMESTAMP_ANOMALY > FREQUENCY_DROP > JITTER / MILD_DROP
	/// Đảm bảo Finding #1 luôn là sự cố gốc rễ (Root Cause) để AI Agent phân tích chính xác tuyệt đối.
	/// </summary>
	public class FindingAggregator : IFindingAggregator
	{
		public List<RosbagAnomalyDto> AggregateAndRank(IEnumerable<RosbagAnomalyDto> rawAnomalies, RosbagAnalysisContext context)
		{
			var list = rawAnomalies.ToList();
			if (list.Count == 0) return list;

			// 1. Khử trùng lặp (Deduplication) dựa trên (Topic + AnomalyType + TimeRange)
			var deduped = new List<RosbagAnomalyDto>();
			var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

			foreach (var item in list)
			{
				var key = $"{item.Topic}|{item.AnomalyType}|{item.TimeRange}";
				if (seenKeys.Add(key))
				{
					deduped.Add(item);
				}
			}

			// 2. Lọc nhiễu (Noise Suppression)
			bool hasNodeCrash = deduped.Any(a => a.AnomalyType == "NODE_CRASH");
			bool hasTfCritical = deduped.Any(a => a.AnomalyType is "TF_TREE_BROKEN" or "TF_PARENT_SWITCH" or "INVALID_QUATERNION");
			bool hasSensorCritical = deduped.Any(a => a.AnomalyType is "ACCEL_SPIKE" or "SENSOR_STUCK" or "GYRO_SATURATION");
			// P2: Phát hiện lệch pha nghiêm trọng (CRITICAL TIMESTAMP_OFFSET >= 200ms hoặc CLOCK_DRIFT)
			bool hasCriticalTimestampIssue = deduped.Any(a =>
				(a.AnomalyType is "TIMESTAMP_OFFSET" or "CLOCK_DRIFT") && a.Severity == "CRITICAL");

			var filtered = new List<RosbagAnomalyDto>();
			foreach (var a in deduped)
			{
				// Nếu đã có NODE_CRASH toàn diện, bỏ qua các TOPIC_TIMEOUT đơn lẻ trên từng topic để tránh rác finding
				if (hasNodeCrash && a.AnomalyType == "TOPIC_TIMEOUT")
				{
					continue;
				}

				// Nếu kịch bản đã có lỗi cốt lõi (Cây TF vỡ hoặc Cảm biến đơ/shock), gạt bỏ nhiễu rung lắc tần số nhẹ (Jitter / Mild Drop < 30%)
				if ((hasTfCritical || hasSensorCritical) && a.AnomalyType is "HIGH_JITTER")
				{
					continue;
				}

				// P2: Nếu có lệch pha thời gian nghiêm trọng (>= 200ms), gạt bỏ sensor outlier giả
				// vì chúng có thể do mis-sync timestamp, không phải lỗi phần cứng thực sự
				if (hasCriticalTimestampIssue && a.AnomalyType is "ACCEL_SPIKE" or "GYRO_SATURATION" or "GYRO_BIAS_DRIFT")
				{
					continue;
				}

				filtered.Add(a);
			}

			if (filtered.Count == 0) filtered = deduped;

			// 3. Xếp hạng ưu tiên theo phân cấp (Priority Ranking)
			// P2: Sử dụng context-aware priority — nâng TIMESTAMP_OFFSET/CLOCK_DRIFT lên cao hơn khi severity = CRITICAL
			return filtered
				.OrderByDescending(a => GetContextAwarePriority(a))
				.ThenByDescending(a => GetSeverityRank(a.Severity))
				.ToList();
		}

			/// <summary>
		/// P2: Context-aware priority — nâng TIMESTAMP_OFFSET / CLOCK_DRIFT lên Cấp 1 khi severity = CRITICAL (offset >= 200ms).
		/// Điều này đảm bảo lệch pha thời gian nghiêm trọng luôn xuất hiện trước sensor outlier trong báo cáo.
		/// </summary>
		private static int GetContextAwarePriority(RosbagAnomalyDto anomaly)
		{
			int basePriority = GetAnomalyPriority(anomaly.AnomalyType);

			// Nâng lệch pha CRITICAL lên ngang hàng với sự cố hệ thống (Cấp 1)
			if (anomaly.Severity == "CRITICAL" &&
				anomaly.AnomalyType is "TIMESTAMP_OFFSET" or "CLOCK_DRIFT")
			{
				return 97; // Cao hơn TF_TREE_BROKEN (95) nhưng dưới NODE_CRASH (100)
			}

			return basePriority;
		}

		private static int GetAnomalyPriority(string anomalyType)
		{
			return anomalyType.ToUpperInvariant() switch
			{
				// Cấp 1: Sự cố sập hệ thống hoặc vỡ đồ thị tọa độ robot
				"NODE_CRASH" => 100,
				"TF_TREE_BROKEN" => 95,
				"TF_PARENT_SWITCH" => 92,
				"INVALID_QUATERNION" => 90,
				"TF_FRAME_JUMP" => 88,

				// Cấp 2: Dị thường cảm biến vật lý cực đoan
				"ACCEL_SPIKE" => 85,
				"SENSOR_STUCK" => 82,
				"GYRO_SATURATION" => 80,
				"GYRO_BIAS_DRIFT" => 78,

				// Cấp 3: Mất tín hiệu topic
				"MULTI_TOPIC_DROPOUT" => 75,
				"TOPIC_TIMEOUT" => 72,
				"INTERMITTENT_DROPOUT" => 70,
				"DROPPED_FRAME" => 68,

				// Cấp 4: Lệch mốc thời gian và xung nhịp
				"TIMESTAMP_INVERSION" => 65,
				"CLOCK_DRIFT" => 62,
				"TIMESTAMP_OFFSET" => 60,

				// Cấp 5: Sụt giảm tần số
				"FREQUENCY_DROP" => 55,
				"GRADUAL_DEGRADATION" => 52,
				"BURST_LOSS" => 50,
				"HIGH_JITTER" => 40,
				"EMPTY_PAYLOAD" => 30,

				_ => 10
			};
		}

		private static int GetSeverityRank(string severity)
		{
			return severity.ToUpperInvariant() switch
			{
				"CRITICAL" => 4,
				"HIGH" => 3,
				"MEDIUM" => 2,
				"LOW" => 1,
				_ => 0
			};
		}
	}
}
