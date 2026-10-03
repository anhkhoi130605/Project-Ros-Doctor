using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 1: Kiểm tra tính đơn điệu, độ lệch pha và độ giật của nhãn thời gian (Timestamp Inversion, High Jitter, Clock Drift, Header-vs-Bag Offset).
	/// </summary>
	public interface ITimestampSyncAnalyzer
	{
		Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default);
	}
}
