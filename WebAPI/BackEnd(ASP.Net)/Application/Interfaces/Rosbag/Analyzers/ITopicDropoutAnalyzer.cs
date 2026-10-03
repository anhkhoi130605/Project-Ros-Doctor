using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 1: Phân tích khoảng lặng (Silent Gaps) trên từng topic (Transient, Permanent, Intermittent, Multi-topic dropout).
	/// </summary>
	public interface ITopicDropoutAnalyzer
	{
		Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default);
	}
}
