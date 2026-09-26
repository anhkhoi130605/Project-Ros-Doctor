using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace API.Middlewares;

public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;

    // Mask các trường nhạy cảm để chống rò rỉ dữ liệu trong log (OWASP A09)
    private static readonly Regex SensitiveDataRegex = new(
        @"(""(?:password|pwd|secret|accessToken|token|clientSecret|refreshToken|passwordHash)""\s*:\s*"")[^""]*("")",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip response body buffering for GET requests to optimize read performance and memory usage
        if (context.Request.Method == HttpMethods.Get)
        {
            await _next(context);
            _logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode);
            return;
        }

        var requestBody = string.Empty;
        var originalBodyStream = context.Response.Body;

        if (context.Request.ContentLength > 0)
        {
            context.Request.EnableBuffering();
            using var reader = new StreamReader(
                context.Request.Body,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                leaveOpen: true);

            requestBody = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
        }

        var responseBody = string.Empty;
        using var responseBodyStream = new MemoryStream();
        context.Response.Body = responseBodyStream;

        try
        {
            await _next(context);

            responseBodyStream.Seek(0, SeekOrigin.Begin);
            responseBody = await new StreamReader(responseBodyStream).ReadToEndAsync();
            responseBodyStream.Seek(0, SeekOrigin.Begin);

            context.Response.Body = originalBodyStream;
            await responseBodyStream.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }

        var sanitizedRequestBody = Sanitize(requestBody);
        var sanitizedResponseBody = Sanitize(responseBody);

        _logger.LogInformation(
            "HTTP {Method} {Path} responded {StatusCode}. RequestBody={RequestBody}. ResponseBody={ResponseBody}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sanitizedRequestBody,
            sanitizedResponseBody);
    }

    private static string Sanitize(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;
        return SensitiveDataRegex.Replace(content, "$1***MASKED***$2");
    }
}
