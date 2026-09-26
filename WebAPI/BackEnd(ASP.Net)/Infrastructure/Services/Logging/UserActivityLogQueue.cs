using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Application.Interfaces.Logging;

namespace Infrastructure.Services.Logging
{
    public class UserActivityLogQueue : IUserActivityLogQueue
    {
        private readonly Channel<LogActivityRequest> _channel;

        public UserActivityLogQueue()
        {
            var options = new BoundedChannelOptions(10_000)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false
            };
            _channel = Channel.CreateBounded<LogActivityRequest>(options);
        }

        public ValueTask EnqueueAsync(LogActivityRequest request, CancellationToken cancellationToken = default)
        {
            return _channel.Writer.WriteAsync(request, cancellationToken);
        }

        public IAsyncEnumerable<LogActivityRequest> ReadAllAsync(CancellationToken cancellationToken)
        {
            return _channel.Reader.ReadAllAsync(cancellationToken);
        }
    }
}
