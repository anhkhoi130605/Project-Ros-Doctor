using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Threading.RateLimiting;
using API.Middlewares;
using API.Middlewares.Extentions;
using Application;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(serverOptions =>
{
	serverOptions.AddServerHeader = false;
	serverOptions.Limits.MaxRequestBodySize = 30L * 1024 * 1024; // 30 MB
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
	options.ValueLengthLimit = 64 * 1024;
	options.MultipartBodyLengthLimit = 30L * 1024 * 1024; // 30 MB
	options.MultipartHeadersLengthLimit = 16 * 1024;
});

// Clean Architecture: Application & Infrastructure layer registrations
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.AddControllers()
	.AddJsonOptions(options =>
	{
		options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
	});

builder.Services.AddSignalR();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();


allowedOrigins ??=
[
	"http://localhost:5173",
	"https://localhost:5173",
	"http://localhost:80",
	"http://localhost"
];


builder.Services.AddCors(options =>
{
	options.AddPolicy("Frontend", policy =>
	{
		policy
			.WithOrigins(allowedOrigins)
			.AllowAnyHeader()
			.AllowAnyMethod()
			.AllowCredentials();
	});
});

builder.Services.AddResponseCompression(options =>
{
	options.EnableForHttps = false;
	options.Providers.Add<BrotliCompressionProvider>();
	options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
	options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
	options.Level = CompressionLevel.Fastest;
});

builder.Services.AddOpenApi();

builder.Services.AddRateLimiter(options =>
{
	options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
	options.AddPolicy("activity-search", context =>
		RateLimitPartition.GetFixedWindowLimiter(
			context.User.GetUserId() ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
			_ => new FixedWindowRateLimiterOptions
			{
				PermitLimit = 60,
				Window = TimeSpan.FromMinutes(1),
				QueueLimit = 0,
				AutoReplenishment = true
			}));

	options.AddPolicy("auth-limiter", context =>
		RateLimitPartition.GetFixedWindowLimiter(
			context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
			_ => new FixedWindowRateLimiterOptions
			{
				PermitLimit = 10,
				Window = TimeSpan.FromMinutes(1),
				QueueLimit = 0,
				AutoReplenishment = true
			}));
});


builder.Services.AddOutputCache(options =>
{
	options.AddPolicy("PublicData", policy =>
		policy.Expire(TimeSpan.FromSeconds(30)));
});

builder.Services.AddHealthChecks();


var app = builder.Build();


// 2. Forwarded Headers cho Docker / Reverse Proxy
var forwardedOptions = new ForwardedHeadersOptions
{
	ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);
app.UseGlobalExceptionMiddleware();


app.UseResponseCompression();


app.UseOutputCache();

if (app.Environment.IsDevelopment())
{
	app.MapOpenApi();
}


if (!app.Environment.IsDevelopment())
{
	app.UseHsts();
}

app.UseHttpsRedirection();


/* Security Headers */
app.Use(async (context, next) =>
{
	var headers = context.Response.Headers;

	// Ngăn MIME type sniffing
	headers["X-Content-Type-Options"] = "nosniff";

	// Chống clickjacking
	headers["X-Frame-Options"] = "DENY";

	// Giới hạn thông tin URL được gửi qua Referer
	headers["Referrer-Policy"] =
		"strict-origin-when-cross-origin";

	// Tắt các tính năng trình duyệt API không cần sử dụng
	headers["Permissions-Policy"] =
		"camera=(), microphone=(), geolocation=()";

	// Không cho phép các ứng dụng Flash/PDF cũ
	// sử dụng cross-domain policy file
	headers["X-Permitted-Cross-Domain-Policies"] = "none";

	// Cho phép load tài nguyên cho React SPA giao diện
	headers["Content-Security-Policy"] =
		"default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'none';";

	await next();
});

app.UseCors("Frontend");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRequestResponseLogging();

// 4. Auth & Limiting pipeline
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.UseMiddleware<UserActivityAuditMiddleware>();
app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<API.Hubs.ChatHub>("/hubs/chat");
app.MapFallbackToFile("index.html");

app.Run();