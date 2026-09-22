// API/Middlewares/GlobalExceptionMiddleware.cs
using System.Net;
using System.Text.Json;

namespace API.Middlewares;

public class GlobalExceptionMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ILogger<GlobalExceptionMiddleware> _logger;

	public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
	{
		_next = next;
		_logger = logger;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			// Cho request đi tiếp sang các Middleware tiếp theo (hoặc vào Controller)
			await _next(context);
		}
		catch (Exception ex)
		{
			// Nếu có bất kỳ lỗi nào xảy ra ở các tầng dưới (Application, Infrastructure...) 
			// nó sẽ bị "bắt" tại đây
			_logger.LogError(ex, "Một lỗi không mong muốn đã xảy ra: {Message}", ex.Message);

			await HandleExceptionAsync(context, ex);
		}
	}

	private static Task HandleExceptionAsync(HttpContext context, Exception exception)
	{
		context.Response.ContentType = "application/json";

		// 1. Mặc định là lỗi 500
		var statusCode = HttpStatusCode.InternalServerError;
		var message = "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";

		// 2. Phân loại lỗi dựa trên loại Exception ném lên từ tầng Application/Domain
		switch (exception)
		{
			case UnauthorizedAccessException:
				statusCode = HttpStatusCode.Unauthorized;
				message = "Bạn không có quyền truy cập vào tài nguyên này.";
				break;

			case KeyNotFoundException:
				statusCode = HttpStatusCode.NotFound;
				message = "Không tìm thấy dữ liệu yêu cầu.";
				break;

			case ArgumentException:
				// Hoặc bất kỳ Custom Exception nào của bạn (ví dụ: BadHttpRequestException)
				statusCode = HttpStatusCode.BadRequest;
				message = exception.Message; // Trả về câu thông báo lỗi cụ thể (ví dụ: "Mật khẩu không chính xác")
				break;
		}

		context.Response.StatusCode = (int)statusCode;

		var response = new
		{
			StatusCode = context.Response.StatusCode,
			Message = message,
			Detail = exception.Message
		};

		var jsonResult = JsonSerializer.Serialize(response);
		return context.Response.WriteAsync(jsonResult);
	}
}       