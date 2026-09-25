using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Common.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

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

	private static Task HandleExceptionResponseAsync(HttpContext context, Exception exception, HttpStatusCode statusCode)
	{
		context.Response.ContentType = "application/json";
		context.Response.StatusCode = (int)statusCode;

		var message = HttpStatusTranslator.GetVietnameseMessage(statusCode, exception.Message);

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