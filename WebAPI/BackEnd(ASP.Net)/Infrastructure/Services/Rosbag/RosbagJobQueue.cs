using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag;

namespace Infrastructure.Services.Rosbag
{
	public class RosbagJobQueue : IRosbagJobQueue
	{
		private readonly Channel<RosbagAnalysisJob> _channel;
		private readonly ConcurrentDictionary<string, RosbagAnalysisJob> _jobs = new();

		public RosbagJobQueue()
		{
			var options = new BoundedChannelOptions(100)
			{
				FullMode = BoundedChannelFullMode.Wait,
				SingleReader = false,
				SingleWriter = false
			};
			_channel = Channel.CreateBounded<RosbagAnalysisJob>(options);
		}

		public ChannelReader<RosbagAnalysisJob> Reader => _channel.Reader;

		public ValueTask EnqueueAsync(RosbagAnalysisJob job, CancellationToken cancellationToken = default)
		{
			_jobs[job.JobId] = job;
			return _channel.Writer.WriteAsync(job, cancellationToken);
		}

		public RosbagAnalysisJob? GetJob(string jobId)
		{
			_jobs.TryGetValue(jobId, out var job);
			return job;
		}

		public void UpdateJob(RosbagAnalysisJob job)
		{
			_jobs[job.JobId] = job;
		}
	}
}
