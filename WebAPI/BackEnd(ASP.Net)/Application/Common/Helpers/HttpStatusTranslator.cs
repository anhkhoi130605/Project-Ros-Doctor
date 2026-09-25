using System;
using System.Collections.Generic;
using System.IO;
using System.Net;

namespace Application.Common.Helpers
{
    /// <summary>
    /// Bộ chuyển đổi và dịch mã trạng thái HTTP (HttpStatusCode) sang tiếng Việt thân thiện, rõ ràng và chuẩn mực.
    /// Tuân thủ Clean Architecture: Đặt tại Application layer để API, Infrastructure và các Use Cases đều dùng chung được.
    /// Hỗ trợ đầy đủ gần 40 mã lỗi (4xx Client Errors và 5xx Server Errors).
    /// </summary>
    public static class HttpStatusTranslator
    {
        /// <summary>
        /// Ánh xạ các Exception phổ biến sang HttpStatusCode tương ứng.
        /// </summary>
        public static HttpStatusCode MapExceptionToStatusCode(Exception exception)
        {
            return exception switch
            {
                UnauthorizedAccessException => HttpStatusCode.Unauthorized, // 401
                KeyNotFoundException => HttpStatusCode.NotFound, // 404
                ArgumentNullException => HttpStatusCode.BadRequest, // 400
                ArgumentOutOfRangeException => HttpStatusCode.BadRequest, // 400
                ArgumentException => HttpStatusCode.BadRequest, // 400
                InvalidOperationException => HttpStatusCode.BadRequest, // 400
                FormatException => HttpStatusCode.BadRequest, // 400
                OverflowException => HttpStatusCode.BadRequest, // 400
                FileNotFoundException => HttpStatusCode.NotFound, // 404
                DirectoryNotFoundException => HttpStatusCode.NotFound, // 404
                TimeoutException => HttpStatusCode.RequestTimeout, // 408
                NotImplementedException => HttpStatusCode.NotImplemented, // 501
                OperationCanceledException => HttpStatusCode.RequestTimeout, // 408
                _ => HttpStatusCode.InternalServerError // 500
            };
        }

        /// <summary>
        /// Dịch toàn bộ các mã lỗi HttpStatusCode (gần 40 mã lỗi 4xx và 5xx) sang tiếng Việt.
        /// </summary>
        public static string GetVietnameseMessage(HttpStatusCode statusCode, string? customDetail = null)
        {
            return statusCode switch
            {
                // ==================== 4xx Client Errors (27 mã lỗi) ====================
                HttpStatusCode.BadRequest => // 400
                    !string.IsNullOrWhiteSpace(customDetail) 
                        ? customDetail 
                        : "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu đầu vào.",

                HttpStatusCode.Unauthorized => // 401
                    "Chưa xác thực. Bạn cần đăng nhập để truy cập tài nguyên này.",

                HttpStatusCode.PaymentRequired => // 402
                    "Yêu cầu thanh toán. Thao tác này đòi hỏi thanh toán hoặc phí dịch vụ để tiếp tục.",

                HttpStatusCode.Forbidden => // 403
                    "Bị từ chối truy cập. Bạn không có quyền thực hiện thao tác trên tài nguyên này.",

                HttpStatusCode.NotFound => // 404
                    "Không tìm thấy tài nguyên. Dữ liệu hoặc đường dẫn yêu cầu không tồn tại trên hệ thống.",

                HttpStatusCode.MethodNotAllowed => // 405
                    "Phương thức không được hỗ trợ. Phương thức HTTP này không được phép trên tài nguyên yêu cầu.",

                HttpStatusCode.NotAcceptable => // 406
                    "Không thể chấp nhận. Máy chủ không thể tạo phản hồi phù hợp với định dạng yêu cầu của bạn.",

                HttpStatusCode.ProxyAuthenticationRequired => // 407
                    "Yêu cầu xác thực Proxy. Cần xác thực với máy chủ trung gian (Proxy) trước khi tiếp tục.",

                HttpStatusCode.RequestTimeout => // 408
                    "Hết thời gian chờ yêu cầu (Request Timeout). Máy chủ đã hết hạn chờ phản hồi từ phía client.",

                HttpStatusCode.Conflict => // 409
                    !string.IsNullOrWhiteSpace(customDetail)
                        ? customDetail
                        : "Xung đột dữ liệu. Yêu cầu xung đột với trạng thái hiện tại của hệ thống (ví dụ: dữ liệu đã tồn tại).",

                HttpStatusCode.Gone => // 410
                    "Tài nguyên đã bị xóa vĩnh viễn và không còn khả dụng trên máy chủ.",

                HttpStatusCode.LengthRequired => // 411
                    "Thiếu độ dài nội dung. Yêu cầu bắt buộc phải có tiêu đề Content-Length xác định.",

                HttpStatusCode.PreconditionFailed => // 412
                    "Tiền điều kiện thất bại. Một hoặc nhiều điều kiện tiên quyết trong tiêu đề yêu cầu không được thỏa mãn.",

                HttpStatusCode.RequestEntityTooLarge => // 413
                    "Dữ liệu gửi lên quá lớn. Kích thước tập tin hoặc nội dung yêu cầu vượt quá dung lượng cho phép.",

                HttpStatusCode.RequestUriTooLong => // 414
                    "Đường dẫn URI quá dài. Độ dài địa chỉ URL vượt quá giới hạn xử lý tối đa của máy chủ.",

                HttpStatusCode.UnsupportedMediaType => // 415
                    "Định dạng nội dung không được hỗ trợ. Định dạng tệp tin hoặc kiểu dữ liệu (Content-Type) không hợp lệ.",

                HttpStatusCode.RequestedRangeNotSatisfiable => // 416
                    "Phạm vi yêu cầu không thỏa mãn. Phạm vi dữ liệu (Range) được yêu cầu nằm ngoài phạm vi sẵn có.",

                HttpStatusCode.ExpectationFailed => // 417
                    "Kỳ vọng không được đáp ứng. Máy chủ không thể thỏa mãn các điều kiện đặt ra trong tiêu đề Expect.",

                HttpStatusCode.MisdirectedRequest => // 421
                    "Yêu cầu sai hướng. Yêu cầu được gửi đến máy chủ không có khả năng tạo phản hồi hợp lệ.",

                HttpStatusCode.UnprocessableEntity => // 422
                    !string.IsNullOrWhiteSpace(customDetail)
                        ? customDetail
                        : "Dữ liệu không thể xử lý. Định dạng cú pháp đúng nhưng dữ liệu bên trong có lỗi nghiệp vụ logic.",

                HttpStatusCode.Locked => // 423
                    "Tài nguyên đang bị khóa. Tài nguyên này hiện đang bị khóa bởi tiến trình khác và không thể thao tác.",

                HttpStatusCode.FailedDependency => // 424
                    "Phụ thuộc thất bại. Thao tác thất bại do phụ thuộc vào một yêu cầu trước đó không thành công.",

                HttpStatusCode.UpgradeRequired => // 426
                    "Yêu cầu nâng cấp giao thức. Client cần chuyển sang giao thức mạng mới hơn để tiếp tục.",

                HttpStatusCode.PreconditionRequired => // 428
                    "Yêu cầu điều kiện tiên quyết. Máy chủ đòi hỏi yêu cầu phải đi kèm điều kiện thực thi.",

                HttpStatusCode.TooManyRequests => // 429
                    "Quá nhiều yêu cầu (Rate Limit). Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",

                HttpStatusCode.RequestHeaderFieldsTooLarge => // 431
                    "Tiêu đề yêu cầu quá lớn. Tiêu đề (Headers) gửi lên vượt quá dung lượng cho phép của máy chủ.",

                HttpStatusCode.UnavailableForLegalReasons => // 451
                    "Không khả dụng vì lý do pháp lý. Tài nguyên bị từ chối truy cập do các ràng buộc pháp lý.",

                // ==================== 5xx Server Errors (11 mã lỗi) ====================
                HttpStatusCode.InternalServerError => // 500
                    "Đã có lỗi hệ thống xảy ra trên máy chủ. Đội ngũ kỹ thuật đã được thông báo. Vui lòng thử lại sau.",

                HttpStatusCode.NotImplemented => // 501
                    "Chức năng chưa được triển khai. Máy chủ chưa hỗ trợ chức năng hoặc phương thức được yêu cầu.",

                HttpStatusCode.BadGateway => // 502
                    "Lỗi cổng kết nối (Bad Gateway). Máy chủ nhận được phản hồi không hợp lệ từ máy chủ cấp trên hoặc upstream service.",

                HttpStatusCode.ServiceUnavailable => // 503
                    "Dịch vụ tạm thời không khả dụng. Máy chủ đang quá tải hoặc đang trong quá trình bảo trì định kỳ.",

                HttpStatusCode.GatewayTimeout => // 504
                    "Hết thời gian chờ cổng kết nối (Gateway Timeout). Máy chủ upstream không phản hồi kịp thời.",

                HttpStatusCode.HttpVersionNotSupported => // 505
                    "Phiên bản HTTP không được hỗ trợ. Máy chủ không hỗ trợ phiên bản giao thức HTTP này.",

                HttpStatusCode.VariantAlsoNegotiates => // 506
                    "Lỗi đàm phán biến thể nội dung. Máy chủ có cấu hình xung đột trong quá trình đàm phán nội dung.",

                HttpStatusCode.InsufficientStorage => // 507
                    "Không đủ dung lượng lưu trữ. Máy chủ không đủ dung lượng đĩa hoặc bộ nhớ để hoàn tất yêu cầu.",

                HttpStatusCode.LoopDetected => // 508
                    "Phát hiện vòng lặp vô tận. Máy chủ phát hiện vòng lặp khi xử lý yêu cầu định tuyến.",

                HttpStatusCode.NotExtended => // 510
                    "Chưa mở rộng. Cần thêm tiện ích mở rộng để máy chủ có thể hoàn tất yêu cầu.",

                HttpStatusCode.NetworkAuthenticationRequired => // 511
                    "Yêu cầu xác thực mạng. Bạn cần xác thực với mạng để có quyền truy cập Internet hoặc tài nguyên.",

                // ==================== 2xx Success ====================
                HttpStatusCode.OK => "Thao tác thành công.", // 200
                HttpStatusCode.Created => "Tạo mới tài nguyên thành công.", // 201
                HttpStatusCode.Accepted => "Yêu cầu đã được tiếp nhận và đang xử lý.", // 202
                HttpStatusCode.NoContent => "Xử lý thành công không có nội dung phản hồi.", // 204

                // Mặc định
                _ => $"Phản hồi mã trạng thái: {(int)statusCode} ({statusCode})."
            };
        }
    }
}
