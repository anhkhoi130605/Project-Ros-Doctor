using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace Infrastructure.Services.Logging
{
    public class SystemErrorLogService : ISystemErrorLogService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SystemErrorLogService> _logger;

        public SystemErrorLogService(IServiceScopeFactory scopeFactory, ILogger<SystemErrorLogService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public Task LogErrorAsync(
            Exception ex,
            string? requestPath = null,
            string? httpMethod = null,
            int statusCode = 500,
            string? userId = null,
            string? ipAddress = null,
            string? userAgent = null,
            string? customMessage = null,
            string logLevel = "Error")
        {
            if (ex == null) return Task.CompletedTask;

            var exceptionType = ex.GetType().FullName ?? ex.GetType().Name;
            var rawMessage = string.IsNullOrWhiteSpace(customMessage) ? ex.Message : $"{customMessage} | {ex.Message}";
            var translated = TranslateException(ex, customMessage);

            _logger.LogError(
                ex,
                "SystemErrorLog | Type={ExceptionType} Path={Path} Method={Method} Status={StatusCode} Translation={Translation}",
                exceptionType, requestPath, httpMethod, statusCode, translated);

            // Persist asynchronously in background so we never block or fail the caller
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                    var errorLog = new SystemErrorLog
                    {
                        LogLevel = logLevel,
                        ExceptionType = exceptionType,
                        ErrorMessage = rawMessage.Length > 2000 ? rawMessage[..2000] : rawMessage,
                        TranslatedMessage = translated.Length > 2000 ? translated[..2000] : translated,
                        StackTrace = ex.StackTrace,
                        RequestPath = requestPath,
                        HttpMethod = httpMethod,
                        StatusCode = statusCode,
                        UserId = userId,
                        IpAddress = ipAddress,
                        UserAgent = userAgent
                    };

                    await unitOfWork.SystemErrorLogs.CreateAsync(errorLog);
                    await unitOfWork.SaveChangesAsync();
                }
                catch (Exception dbEx)
                {
                    _logger.LogError(dbEx, "Failed to persist SystemErrorLog to database. Exception was: {OrigEx}", ex.Message);
                }
            });

            return Task.CompletedTask;
        }

        /// <summary>
        /// Bộ máy dịch lỗi sang tiếng Việt thân thiện, rõ ràng, chi tiết ngữ cảnh.
        /// </summary>
        private static string TranslateException(Exception ex, string? customMessage)
        {
            var exType = ex.GetType().Name;
            var fullTypeName = ex.GetType().FullName ?? "";
            var innerMessage = ex.InnerException?.Message ?? string.Empty;
            var combinedMessage = $"{ex.Message} {innerMessage}".ToLowerInvariant();

            // 1. Phân loại theo lỗi CSDL & Entity Framework
            if (fullTypeName.Contains("DbUpdateConcurrencyException") || exType.Contains("DbUpdateConcurrencyException"))
            {
                return "Lỗi xung đột dữ liệu đồng thời: Dữ liệu bạn đang cố cập nhật đã bị thay đổi bởi người dùng khác cùng thời điểm.";
            }

            if (fullTypeName.Contains("DbUpdateException") || exType.Contains("DbUpdateException"))
            {
                if (combinedMessage.Contains("duplicate entry") || combinedMessage.Contains("unique constraint") || combinedMessage.Contains("already exists"))
                {
                    return "Lỗi trùng lặp dữ liệu: Dữ liệu (email, số điện thoại hoặc mã định danh) đã tồn tại trong cơ sở dữ liệu.";
                }
                if (combinedMessage.Contains("foreign key") || combinedMessage.Contains("cannot add or update a child row"))
                {
                    return "Lỗi ràng buộc khóa ngoại: Đối tượng liên kết không tồn tại hoặc dữ liệu đang được tham chiếu bởi bảng khác.";
                }
                if (combinedMessage.Contains("cannot be null") || combinedMessage.Contains("doesn't have a default value"))
                {
                    return "Lỗi thiếu dữ liệu bắt buộc: Cơ sở dữ liệu yêu cầu một trường không được để trống.";
                }
                if (combinedMessage.Contains("data too long") || combinedMessage.Contains("string or binary data would be truncated"))
                {
                    return "Lỗi vượt quá độ dài ký tự: Nội dung văn bản gửi lên dài hơn giới hạn lưu trữ của cột trong CSDL.";
                }

                return $"Lỗi lưu trữ cơ sở dữ liệu: Không thể hoàn tất thao tác ghi dữ liệu. Chi tiết kỹ thuật: {ex.Message}";
            }

            if (fullTypeName.Contains("MySql") || exType.Contains("MySql") || combinedMessage.Contains("mysql"))
            {
                if (combinedMessage.Contains("unable to connect") || combinedMessage.Contains("connection refused") || combinedMessage.Contains("host") || combinedMessage.Contains("timeout"))
                {
                    return "Lỗi kết nối cơ sở dữ liệu MySQL/TiDB: Máy chủ không thể kết nối đến Database hoặc đã hết thời gian chờ kết nối.";
                }
                return $"Lỗi truy vấn cơ sở dữ liệu MySQL: {ex.Message}";
            }

            // 2. Phân loại theo các Exception chuẩn trong .NET
            switch (ex)
            {
                case NullReferenceException:
                    return "Lỗi tham chiếu Null (NullReferenceException): Cố gắng thao tác trên một đối tượng chưa được khởi tạo hoặc có giá trị null.";

                case ArgumentNullException argNull:
                    return $"Lỗi thiếu tham số bắt buộc (ArgumentNullException): Tham số '{argNull.ParamName ?? "không xác định"}' không được truyền hoặc có giá trị null.";

                case ArgumentOutOfRangeException argRange:
                    return $"Lỗi giá trị ngoài phạm vi (ArgumentOutOfRangeException): Tham số '{argRange.ParamName ?? "giá trị"}' nằm ngoài giới hạn cho phép.";

                case ArgumentException:
                    return $"Lỗi đối số không hợp lệ (ArgumentException): Dữ liệu gửi lên không đúng định dạng hoặc không hợp lệ: {ex.Message}";

                case UnauthorizedAccessException:
                    return "Lỗi phân quyền truy cập (UnauthorizedAccessException): Bạn chưa đăng nhập hoặc không đủ thẩm quyền để truy cập tài nguyên này.";

                case KeyNotFoundException:
                    return "Lỗi không tìm thấy bản ghi (KeyNotFoundException): Không tìm thấy dữ liệu tương ứng với mã yêu cầu trong hệ thống.";

                case InvalidOperationException:
                    return $"Lỗi thao tác không hợp lệ (InvalidOperationException): Thao tác bị từ chối do trạng thái hiện tại của hệ thống không cho phép ({ex.Message}).";

                case NotImplementedException:
                    return "Lỗi tính năng chưa hoàn thiện (NotImplementedException): Chức năng này đang được phát triển và chưa được triển khai hoàn chỉnh.";

                case TimeoutException:
                    return "Lỗi quá thời gian chờ (TimeoutException): Tác vụ xử lý mất quá nhiều thời gian và đã bị hủy do hết hạn chờ.";

                case FormatException:
                    return "Lỗi sai định dạng dữ liệu (FormatException): Chuỗi dữ liệu gửi lên không thể chuyển đổi sang kiểu dữ liệu đích (ví dụ: chuỗi sang ngày tháng hoặc số).";

                case OverflowException:
                    return "Lỗi tràn số (OverflowException): Giá trị số tính toán vượt quá giới hạn lưu trữ tối đa của hệ thống.";

                case FileNotFoundException fileNotFound:
                    return $"Lỗi không tìm thấy tệp (FileNotFoundException): Hệ thống không tìm thấy file '{fileNotFound.FileName ?? "yêu cầu"}' trên ổ đĩa.";

                case DirectoryNotFoundException:
                    return "Lỗi không tìm thấy thư mục (DirectoryNotFoundException): Đường dẫn thư mục yêu cầu không tồn tại.";

                case IOException:
                    return $"Lỗi xuất nhập tệp tin/hệ thống (IOException): Xảy ra lỗi khi đọc/ghi file hoặc truy cập ổ đĩa: {ex.Message}";

                case SocketException:
                    return "Lỗi kết nối Socket mạng (SocketException): Không thể thiết lập kết nối mạng hoặc cổng giao tiếp đã bị đóng.";

                case TaskCanceledException or OperationCanceledException:
                    return "Lỗi thao tác bị hủy bỏ (OperationCanceledException): Yêu cầu đã bị người dùng hủy hoặc vượt quá thời gian timeout của tiến trình.";
            }

            // 3. Fallback cho các loại lỗi khác
            if (!string.IsNullOrWhiteSpace(customMessage))
            {
                return $"{customMessage}. Chi tiết lỗi: {ex.Message}";
            }

            return $"Lỗi hệ thống ({ex.GetType().Name}): {ex.Message}";
        }
    }
}
