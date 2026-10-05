using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace API.Middlewares;

public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    // Mask các trường nhạy cảm để chống rò rỉ dữ liệu trong log (OWASP A09)
    private static readonly Regex SensitiveDataRegex = new(
        @"(""(?:password|pwd|secret|accessToken|token|clientSecret|refreshToken|passwordHash)""\s*:\s*"")[^""]*("")",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public RequestResponseLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestResponseLoggingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        // Trong môi trường Production hoặc đối với request GET/Multipart:
        // Không buffer MemoryStream để tránh ngốn RAM và nghẽn garbage collection.
        bool isDevelopment = _env.IsDevelopment();
        bool isMultipart = context.Request.HasFormContentType
            || (context.Request.ContentType?.Contains("multipart", StringComparison.OrdinalIgnoreCase) ?? false)
            || (context.Request.Path.Value?.Contains("upload", StringComparison.OrdinalIgnoreCase) ?? false);

        if (!isDevelopment || isMultipart || context.Request.Method == HttpMethods.Get)
        {
            await _next(context);
            sw.Stop();

            _logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms [Length: {Length}]",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds,
                context.Response.ContentLength ?? 0);
            return;
        }

        // Chế độ Development: cho phép đọc body có kiểm soát dung lượng để tiện debug
        var requestBody = string.Empty;
        var originalBodyStream = context.Response.Body;

        if (context.Request.ContentLength > 0 && context.Request.ContentLength < 100_000)
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
            sw.Stop();

            if (responseBodyStream.Length < 100_000)
            {
                responseBodyStream.Seek(0, SeekOrigin.Begin);
                responseBody = await new StreamReader(responseBodyStream).ReadToEndAsync();
                responseBodyStream.Seek(0, SeekOrigin.Begin);
            }

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
            "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms. RequestBody={RequestBody}. ResponseBody={ResponseBody}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds,
            sanitizedRequestBody,
            sanitizedResponseBody);
    }

    private static string Sanitize(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;
        return SensitiveDataRegex.Replace(content, "$1***MASKED***$2");
    }
}
