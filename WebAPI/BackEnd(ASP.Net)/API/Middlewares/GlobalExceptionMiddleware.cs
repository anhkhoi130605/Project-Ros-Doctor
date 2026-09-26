using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Common.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace API.Middlewares;

public class GlobalExceptionMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ILogger<GlobalExceptionMiddleware> _logger;
	private readonly IHostEnvironment _env;

	public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
	{
		_next = next;
		_logger = logger;
		_env = env;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			await _next(context);
		}
		catch (Exception ex)
		{
			var statusCode = HttpStatusTranslator.MapExceptionToStatusCode(ex);
			_logger.LogError(ex, "HTTP {Method} {Path} failed with StatusCode {StatusCode}: {Message}", 
				context.Request.Method, context.Request.Path, (int)statusCode, ex.Message);

			await HandleExceptionResponseAsync(context, ex, statusCode);
		}
	}

	private Task HandleExceptionResponseAsync(HttpContext context, Exception exception, HttpStatusCode statusCode)
	{
		context.Response.ContentType = "application/json";
		context.Response.StatusCode = (int)statusCode;

		var message = HttpStatusTranslator.GetVietnameseMessage(statusCode, exception.Message);

		// Bảo mật: Không làm rò rỉ chi tiết lỗi hạ tầng/CSDL trong môi trường Production cho lỗi 500
		string? detail = _env.IsDevelopment()
			? exception.Message
			: (statusCode == HttpStatusCode.InternalServerError ? "Đã có lỗi hệ thống xảy ra. Vui lòng liên hệ quản trị viên." : exception.Message);

		var response = new
		{
			StatusCode = context.Response.StatusCode,
			Message = message,
			Detail = detail,
			ExceptionType = _env.IsDevelopment() ? exception.GetType().FullName : null
		};

		var jsonResult = JsonSerializer.Serialize(response);
		return context.Response.WriteAsync(jsonResult);
	}
}