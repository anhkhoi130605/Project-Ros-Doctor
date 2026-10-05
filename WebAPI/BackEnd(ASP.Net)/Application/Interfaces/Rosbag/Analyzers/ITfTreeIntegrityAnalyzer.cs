using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 2: Giải mã nhị phân CDR của topic /tf (tf2_msgs/msg/TFMessage) để kiểm tra cây REP 105,
	/// phát hiện ghost_frame, corrupted_child, cycle/self-reference, parent switch, quaternion không chuẩn hóa, và coordinate jump.
	/// </summary>
	public interface ITfTreeIntegrityAnalyzer
	{
		Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default);
		List<Domain.Entities.NoSql.TfFrameNode> ExtractedFrames { get; }
	}
}
