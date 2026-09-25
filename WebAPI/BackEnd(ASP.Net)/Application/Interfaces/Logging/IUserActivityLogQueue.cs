using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Interfaces.Logging
{
    public interface IUserActivityLogQueue
    {
        ValueTask EnqueueAsync(LogActivityRequest request, CancellationToken cancellationToken = default);
        IAsyncEnumerable<LogActivityRequest> ReadAllAsync(CancellationToken cancellationToken);
    }
}
