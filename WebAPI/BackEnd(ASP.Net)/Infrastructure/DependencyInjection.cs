using System.Text;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Application.Interfaces.Notifications;
using Application.Interfaces.Storage;
using Application.Interfaces; // IEmailService
using Infrastructure.Services; // SmtpEmailService
using Infrastructure.Services.Logging;
using Infrastructure.Services.Notification;
using Domain.ConfigModel;
using Infrastructure.Authentication;
using Infrastructure.Persistence.Configurations.AuthenticationConfig;
using System;
using AutoMapper;
using Infrastructure.Persistence.Storage;
using Infrastructure.Repository;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;


namespace ResUpClub.Infrastructure.ConfigModel;

public static class DependencyInjection
{
	public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
	{
		var connectionString = configuration.GetConnectionString("DefaultConnection");
		if (string.IsNullOrWhiteSpace(connectionString))
		{
			throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
		}

		services.AddDbContext<AppDbContext>(options =>
			options.UseMySql(connectionString, ServerVersion.Parse("8.4.8-mysql")));

		// 1. Bind configuration sections
		// JWTConfiguration is a POCO used by infrastructure JwtTokenGenerator
		var jwtConfig = configuration.GetSection("Jwt").Get<JWTConfiguration>() ?? new JWTConfiguration();
		services.AddSingleton(jwtConfig);

		// Use Options pattern for other settings consumed via IOptions<T>
		services.Configure<CloudinarySettings>(configuration.GetSection("Cloudinary"));
		services.Configure<StorageSettings>(configuration.GetSection("Storage"));
		services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));
		services.Configure<RedisSettings>(configuration.GetSection("Redis"));

		// 2. Register core services
		// Register repository implementations used by UnitOfWork
		services.AddScoped<IUserRepository, UserRepository>();
		services.AddScoped<IUnitOfWork, UnitOfWork>();
		services.AddScoped<IJWTTokenGenerator, JWTTokenGenerator>();
		services.AddScoped<IEmailService, SmtpEmailService>();
		services.AddScoped<IStorageService, CloudinaryStorageService>();
		services.AddScoped<IUserActivityLogService, UserActivityLogService>();
		services.AddScoped<ISystemErrorLogService, SystemErrorLogService>();
		services.AddScoped<INotificationService, NotificationService>();
		services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();

		// 3. Configure Redis Cache
		var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>();
		if (redisSettings != null && !string.IsNullOrEmpty(redisSettings.Configuration))
		{
			services.AddStackExchangeRedisCache(options =>
			{
				options.Configuration = redisSettings.Configuration;
				options.InstanceName = redisSettings.InstanceName;
			});
		}

		// 5. Register AutoMapper: scan the Application assembly for Profile classes so
		// AutoMapper.IMapper will be available for application handlers.
		services.AddAutoMapper(cfg => cfg.AddMaps(typeof(Application.Features.Admin.ManageUser.ReadDataUser.CommandAdminReadDataUser.AdminReadDataProfile).Assembly));

		// 4. Authentication configuration (Google + JWT for APIs)
		var googleSettings = configuration.GetSection("Authentication:Google");

		services.AddAuthentication(options =>
		{
			options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
			options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
		})
		.AddCookie(options =>
		{
			options.Cookie.SameSite = SameSiteMode.None;
			options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
			options.Cookie.HttpOnly = true;
		})
		.AddJwtBearer(options =>
		{
			// Cấu hình JwtBearer bảo mật cho các API thông thường sau này khi React gọi lên
			// (Thêm gói Microsoft.AspNetCore.Authentication.JwtBearer nếu chưa có)
			options.TokenValidationParameters = new TokenValidationParameters
			{
				ValidateIssuer = true,
				ValidateAudience = true,
				ValidateLifetime = true,
				ValidateIssuerSigningKey = true,
				ValidIssuer = jwtConfig.Issuer,
				ValidAudience = jwtConfig.Audience,
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig.Key ?? string.Empty))
			};
		})
	   .AddGoogle(options =>
	   {
		   options.ClientId = googleSettings["ClientId"]!;
		   options.ClientSecret = googleSettings["ClientSecret"]!;
		   // Google will redirect to this path after consent. This must match the
		   // Authorized redirect URI configured in Google Cloud Console (including scheme and port).
		   options.CallbackPath = "/signin-google";
		   options.CorrelationCookie.SameSite = SameSiteMode.None;
		   options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
	   });

		return services;
	}
}