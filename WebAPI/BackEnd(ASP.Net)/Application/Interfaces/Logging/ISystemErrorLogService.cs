namespace Application.Interfaces.Logging
{
    /// <summary>
    /// Ghi lại các lỗi hệ thống (exception) phục vụ monitoring và debug.
    /// </summary>
    public interface ISystemErrorLogService
    {
        Task LogErrorAsync(
            Exception ex,
            string? customMessage = null,
            string? userId = null);
    }
}
