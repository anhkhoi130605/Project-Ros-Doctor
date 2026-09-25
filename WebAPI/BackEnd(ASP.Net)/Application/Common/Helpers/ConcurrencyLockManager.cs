using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Common.Helpers
{
    /// <summary>
    /// Quản lý khóa đồng thời (Keyed Concurrency Lock) bằng SemaphoreSlim.
    /// Giúp chống Race Condition trên các luồng nghiệp vụ quan trọng (đăng ký trùng email, thao tác ví, sửa profile đồng thời).
    /// </summary>
    public static class ConcurrencyLockManager
    {
        private sealed class RefCountedSemaphore
        {
            public SemaphoreSlim Semaphore { get; } = new(1, 1);
            public int RefCount = 1;
        }

        private static readonly ConcurrentDictionary<string, RefCountedSemaphore> _semaphores = new();

        /// <summary>
        /// Xin khóa bất đồng bộ theo Key. Trả về IDisposable để tự động giải phóng khóa bằng khối `using`.
        /// </summary>
        public static async Task<IDisposable> LockAsync(string key, TimeSpan timeout = default, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new ArgumentException("Lock key không được để trống.", nameof(key));
            }

            var refCounted = _semaphores.AddOrUpdate(
                key,
                _ => new RefCountedSemaphore(),
                (_, existing) =>
                {
                    Interlocked.Increment(ref existing.RefCount);
                    return existing;
                });

            bool entered;
            if (timeout > TimeSpan.Zero)
            {
                entered = await refCounted.Semaphore.WaitAsync(timeout, cancellationToken);
            }
            else
            {
                await refCounted.Semaphore.WaitAsync(cancellationToken);
                entered = true;
            }

            if (!entered)
            {
                Release(key, refCounted);
                throw new TimeoutException($"Không thể nhận khóa tài nguyên cho khóa '{key}' do hết thời gian chờ.");
            }

            return new Releaser(key, refCounted);
        }

        private static void Release(string key, RefCountedSemaphore refCounted)
        {
            refCounted.Semaphore.Release();
            if (Interlocked.Decrement(ref refCounted.RefCount) <= 0)
            {
                _semaphores.TryRemove(key, out _);
            }
        }

        private sealed class Releaser : IDisposable
        {
            private readonly string _key;
            private readonly RefCountedSemaphore _refCounted;
            private bool _disposed;

            public Releaser(string key, RefCountedSemaphore refCounted)
            {
                _key = key;
                _refCounted = refCounted;
            }

            public void Dispose()
            {
                if (_disposed) return;
                _disposed = true;
                Release(_key, _refCounted);
            }
        }
    }
}
