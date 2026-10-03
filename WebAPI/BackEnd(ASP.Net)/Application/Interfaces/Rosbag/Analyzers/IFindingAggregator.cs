using System.Collections.Generic;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 3: Tổng hợp, khử trùng lặp (dedup), lọc nhiễu đuôi file và xếp hạng ưu tiên:
	/// NODE_CRASH >= TF_TREE_BROKEN > SENSOR_OUTLIER > TOPIC_DROPOUT > TIMESTAMP_ANOMALY > FREQUENCY_DROP > JITTER / MILD_DROP
	/// Đảm bảo Finding #1 luôn là sự cố gốc rễ (Root Cause) để AI Agent phân tích chính xác tuyệt đối.
	/// </summary>
	public interface IFindingAggregator
	{
		List<RosbagAnomalyDto> AggregateAndRank(IEnumerable<RosbagAnomalyDto> rawAnomalies, RosbagAnalysisContext context);
	}
}
