using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag
{
	public interface IRosbagJobQueue
	{
		ValueTask EnqueueAsync(RosbagAnalysisJob job, CancellationToken cancellationToken = default);
		RosbagAnalysisJob? GetJob(string jobId);
		void UpdateJob(RosbagAnalysisJob job);
		ChannelReader<RosbagAnalysisJob> Reader { get; }
	}
}
