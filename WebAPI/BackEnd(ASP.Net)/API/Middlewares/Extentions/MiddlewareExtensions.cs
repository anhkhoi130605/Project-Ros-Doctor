using Microsoft.AspNetCore.Builder;

namespace API.Middlewares.Extentions
{
	public static class MiddlewareExtensions
	{
		public static IApplicationBuilder UseGlobalExceptionMiddleware(this IApplicationBuilder app)
		{
			return app.UseMiddleware<GlobalExceptionMiddleware>();
		}

		public static IApplicationBuilder UseRequestResponseLogging(this IApplicationBuilder app)
		{
			return app.UseMiddleware<RequestResponseLoggingMiddleware>();
		}
	}
}