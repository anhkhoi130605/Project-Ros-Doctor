using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 1: Đo đạc tần số xuất bản qua cửa sổ trượt (rolling window) vs tần số danh định (P80 nominal_hz).
	/// Khử nhiễu biên cuối file, gom nhóm chuỗi sụt giảm, phát hiện gradual degradation và burst loss.
	/// </summary>
	public interface IFrequencyDropAnalyzer
	{
		Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default);
	}
}
