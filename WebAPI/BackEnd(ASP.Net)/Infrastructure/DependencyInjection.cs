using System.Text;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Domain.Enums;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Application.Interfaces.ManageForRole;
using Application.Interfaces.Notifications;
using Application.Interfaces.Storage;
using Application.Interfaces; // IEmailService
using Infrastructure.Services; // SmtpEmailService
using Infrastructure.Services.Logging;
using Infrastructure.Services.Notification;
using Infrastructure.ConfigModel;
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
		services.Configure<MongoDbSettings>(configuration.GetSection("MongoDbSettings"));

		// 2. Register core services
		// Register repository implementations used by UnitOfWork
		services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
		services.AddScoped<IUserRepository, UserRepository>();
		services.AddScoped<IUnitOfWork, UnitOfWork>();
		services.AddScoped<IJWTTokenGenerator, JWTTokenGenerator>();
		services.AddScoped<IEmailService, SmtpEmailService>();
		services.AddScoped<IStorageService, CloudinaryStorageService>();
		services.AddSingleton<IUserActivityLogQueue, UserActivityLogQueue>();
		services.AddHostedService<UserActivityLogBackgroundService>();
		services.AddScoped<IUserActivityLogService, UserActivityLogService>();
		services.AddScoped<ISystemErrorLogService, SystemErrorLogService>();
		services.AddScoped<INotificationService, NotificationService>();
		services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
		services.AddScoped<IOtpService, OtpService>();
		services.AddScoped<IAccountPolicyService, AccountPolicyService>();

		// 3. Configure Redis Cache (with Memory Cache fallback for resilience)
		var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>();
		if (redisSettings != null && !string.IsNullOrEmpty(redisSettings.Configuration))
		{
			services.AddStackExchangeRedisCache(options =>
			{
				options.Configuration = redisSettings.Configuration;
				options.InstanceName = redisSettings.InstanceName;
			});
		}
		else
		{
			services.AddDistributedMemoryCache();
		}

		// 5. Register AutoMapper: scan the Application assembly for Profile classes so
		// AutoMapper.IMapper will be available for application handlers.
		services.AddAutoMapper(cfg => cfg.AddMaps(typeof(Application.Features.Admin.ManageUser.ReadDataUser.CommandAdminReadDataUser.AdminReadDataProfile).Assembly));

		// 4. Authentication configuration (Google + JWT for APIs)
		var googleSettings = configuration.GetSection("Authentication:Google");

		services.AddAuthentication(options =>
		{
			options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
			options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
			options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
			options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
		})
		.AddCookie(options =>
		{
			options.Cookie.SameSite = SameSiteMode.None;
			options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
			options.Cookie.HttpOnly = true;
		})
		.AddJwtBearer(options =>
		{
			options.TokenValidationParameters = new TokenValidationParameters
			{
				ValidateIssuer = true,
				ValidateAudience = true,
				ValidateLifetime = true,
				ValidateIssuerSigningKey = true,
				ValidIssuer = jwtConfig.Issuer,
				ValidAudience = jwtConfig.Audience,
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig.Key ?? string.Empty)),
				ClockSkew = TimeSpan.Zero
			};
		})
	   .AddGoogle(options =>
	   {
		   options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
		   options.ClientId = googleSettings["ClientId"]!;
		   options.ClientSecret = googleSettings["ClientSecret"]!;
		   options.CallbackPath = "/signin-google";
		   options.CorrelationCookie.SameSite = SameSiteMode.None;
		   options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
	   });

		// 5. Policy-based Authorization using AccountPolicy & RolePolicyDefaults
		services.AddScoped<IAuthorizationHandler, AccountPolicyHandler>();
		services.AddAuthorization(options =>
		{
			foreach (var policy in UserPolicy.All)
			{
				options.AddPolicy(policy, policyBuilder =>
				{
					policyBuilder.RequireAuthenticatedUser();
					policyBuilder.AddRequirements(new AccountPolicyRequirement(policy));
				});
			}
		});

		return services;
	}
}