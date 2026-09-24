using System.Text;

namespace API.Middlewares;

public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;

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

            if (context.Response.Body.CanSeek)
            {
                context.Response.Body = originalBodyStream;
                await responseBodyStream.CopyToAsync(originalBodyStream);
            }
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }

        _logger.LogInformation(
            "HTTP {Method} {Path} responded {StatusCode}. RequestBody={RequestBody}. ResponseBody={ResponseBody}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            requestBody,
            responseBody);
    }
}
