using System;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Interfaces.ManageTransaction
{
    public interface IApplicationTransaction : IAsyncDisposable, IDisposable
    {
        Task CommitAsync(CancellationToken cancellationToken = default);
        Task RollbackAsync(CancellationToken cancellationToken = default);
    }
}
