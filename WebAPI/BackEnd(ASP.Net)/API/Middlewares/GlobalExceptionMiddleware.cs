using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Application.Interfaces.Logging;

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

	public async Task InvokeAsync(HttpContext context, ISystemErrorLogService errorLogService)
	{
		try
		{
			await _next(context);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Một lỗi không mong muốn đã xảy ra: {Message}", ex.Message);

			var statusCode = MapExceptionToStatusCode(ex);
			var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
			             ?? context.User?.FindFirst("sub")?.Value 
			             ?? context.User?.FindFirst("id")?.Value;
			var ipAddress = context.Connection.RemoteIpAddress?.ToString();
			var userAgent = context.Request.Headers["User-Agent"].ToString();

			// Persist into system error logs
			try
			{
				await errorLogService.LogErrorAsync(
					ex: ex,
					requestPath: context.Request.Path,
					httpMethod: context.Request.Method,
					statusCode: (int)statusCode,
					userId: userId,
					ipAddress: ipAddress,
					userAgent: userAgent,
					logLevel: statusCode == HttpStatusCode.InternalServerError ? "Critical" : "Error"
				);
			}
			catch (Exception logEx)
			{
				_logger.LogError(logEx, "Không thể ghi system log tự động");
			}

			await HandleExceptionResponseAsync(context, ex, statusCode);
		}
	}

	private static HttpStatusCode MapExceptionToStatusCode(Exception exception)
	{
		return exception switch
		{
			UnauthorizedAccessException => HttpStatusCode.Unauthorized,
			KeyNotFoundException => HttpStatusCode.NotFound,
			ArgumentException => HttpStatusCode.BadRequest,
			InvalidOperationException => HttpStatusCode.BadRequest,
			FormatException => HttpStatusCode.BadRequest,
			NotImplementedException => HttpStatusCode.NotImplemented,
			TimeoutException => HttpStatusCode.RequestTimeout,
			_ => HttpStatusCode.InternalServerError
		};
	}

	private static Task HandleExceptionResponseAsync(HttpContext context, Exception exception, HttpStatusCode statusCode)
	{
		context.Response.ContentType = "application/json";
		context.Response.StatusCode = (int)statusCode;

		var message = statusCode switch
		{
			HttpStatusCode.Unauthorized => "Bạn không có quyền truy cập vào tài nguyên này.",
			HttpStatusCode.NotFound => "Không tìm thấy dữ liệu yêu cầu.",
			HttpStatusCode.BadRequest => exception.Message,
			HttpStatusCode.NotImplemented => "Chức năng chưa được triển khai.",
			HttpStatusCode.RequestTimeout => "Yêu cầu đã quá thời gian chờ.",
			_ => "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau."
		};

		var response = new
		{
			StatusCode = context.Response.StatusCode,
			Message = message,
			Detail = exception.Message,
			ExceptionType = exception.GetType().FullName
		};

		var jsonResult = JsonSerializer.Serialize(response);
		return context.Response.WriteAsync(jsonResult);
	}
}