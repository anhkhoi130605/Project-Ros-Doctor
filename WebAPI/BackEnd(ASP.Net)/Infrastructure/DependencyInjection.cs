using System.Text;
using System.Security.Claims;
using Domain.Entities.Identity;
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
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.ManageForRole;
using Application.Interfaces.Notifications;
using Application.Interfaces.Storage;
using Application.Interfaces; // IEmailService
using Infrastructure.Services; // SmtpEmailService
using Infrastructure.Services.Logging;
using Infrastructure.Services.Notification;
using Infrastructure.Policy.Services;
using Infrastructure.ConfigModel;
using Infrastructure.Authentication;
using Infrastructure.Persistence.Configurations.AuthenticationConfig;
using System;
using AutoMapper;
using Infrastructure.Services.Storage;
using Infrastructure.Repository;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Microsoft.Extensions.Options;
namespace Infrastructure;

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
			options.UseMySql(connectionString, ServerVersion.Parse("8.4.8-mysql"), mySqlOptions =>
				mySqlOptions.EnableRetryOnFailure(
					maxRetryCount: 5,
					maxRetryDelay: TimeSpan.FromSeconds(5),
					errorNumbersToAdd: null)));

		// 1. Bind configuration sections
		// JWTConfiguration is a POCO used by infrastructure JwtTokenGenerator
		services.AddOptions<JWTConfiguration>()
				.Bind(configuration.GetSection("Jwt"))
				.Validate(options => !string.IsNullOrWhiteSpace(options.Issuer),"Jwt:Issuer is required.")
				.Validate(options => !string.IsNullOrWhiteSpace(options.Audience),"Jwt:Audience is required.")
				.Validate(options => !string.IsNullOrWhiteSpace(options.Key)&& Encoding.UTF8.GetByteCount(options.Key) >= 32,"Jwt:Key must contain at least 32 bytes.")
				.ValidateOnStart();

		// Keep compatibility with services currently injecting JWTConfiguration.
		var jwtConfig = configuration.GetSection("Jwt").Get<JWTConfiguration>()?? throw new InvalidOperationException("Jwt configuration is missing.");

		if (string.IsNullOrWhiteSpace(jwtConfig.Issuer)|| string.IsNullOrWhiteSpace(jwtConfig.Audience)
													   || string.IsNullOrWhiteSpace(jwtConfig.Key)
													   || System.Text.Encoding.UTF8.GetByteCount(jwtConfig.Key) < 32
													   || jwtConfig.ExpiresMinutes is < 1 or > 1440)
		{
			throw new InvalidOperationException(
				"Jwt configuration is invalid.");
		}

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

		// Rosbag Pipeline Analyzers & Aggregator
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.ITopicDropoutAnalyzer, global::Infrastructure.Services.Rosbag.Analyzers.TopicDropoutAnalyzer>();
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.IFrequencyDropAnalyzer, global::Infrastructure.Services.Rosbag.Analyzers.FrequencyDropAnalyzer>();
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.ITimestampSyncAnalyzer, global::Infrastructure.Services.Rosbag.Analyzers.TimestampSyncAnalyzer>();
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.ITfTreeIntegrityAnalyzer, global::Infrastructure.Services.Rosbag.Analyzers.TfTreeIntegrityAnalyzer>();
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.ISensorPayloadAnalyzer, global::Infrastructure.Services.Rosbag.Analyzers.SensorPayloadAnalyzer>();
		services.AddScoped<Application.Interfaces.Rosbag.Analyzers.IFindingAggregator, global::Infrastructure.Services.Rosbag.Analyzers.FindingAggregator>();
		services.AddScoped<Application.Interfaces.Rosbag.IRosbagInspectorService, global::Infrastructure.Services.Rosbag.RosbagInspectorService>();
		services.AddScoped<Application.Interfaces.Rosbag.IRosbagSubmissionService, global::Infrastructure.Services.Rosbag.RosbagSubmissionService>();
		services.AddSingleton<Application.Interfaces.Rosbag.IRosbagJobQueue, global::Infrastructure.Services.Rosbag.RosbagJobQueue>();
		services.AddHostedService<global::Infrastructure.Services.Rosbag.RosbagJobBackgroundService>();

		// MongoDB Registration & NoSQL Repositories
		services.AddSingleton<global::Infrastructure.Persistence.Mongo.IMongoDbContext, global::Infrastructure.Persistence.Mongo.MongoDbContext>();
		services.AddScoped<Application.Interfaces.Repositories.IReportSnapshotRepository, global::Infrastructure.Persistence.Mongo.Repositories.ReportSnapshotRepository>();
		services.AddScoped<Application.Interfaces.Repositories.ISessionEvidenceRepository, global::Infrastructure.Persistence.Mongo.Repositories.SessionEvidenceRepository>();

		// 3. Configure Redis Cache & Services

		// Redis settings
		services.AddOptions<RedisSettings>().Bind(configuration.GetSection("Redis"))
				.Validate(x => !string.IsNullOrWhiteSpace(x.Configuration),"Redis:Configuration is required.")
				.ValidateOnStart();
		var redisSettings = configuration.GetSection("Redis").Get<RedisSettings>();
		if (redisSettings is null || string.IsNullOrWhiteSpace(redisSettings.Configuration))
		{
			throw new InvalidOperationException(
				"Redis:Configuration is not configured.");
		}
		services.AddStackExchangeRedisCache(options =>{
			options.Configuration = redisSettings.Configuration;
			options.InstanceName = redisSettings.InstanceName;
		});

		services.AddSingleton<IConnectionMultiplexer>(_ =>ConnectionMultiplexer.Connect(redisSettings.Configuration));

		services.AddScoped<Application.Interfaces.Common.IRedisService, Infrastructure.Services.Redis.RedisService>();



		// 4. Authentication configuration (Google + JWT for APIs)
		var googleSettings = configuration.GetSection("Authentication:Google");
		var googleClientId = googleSettings["ClientId"];
		var googleClientSecret = googleSettings["ClientSecret"];
		if (string.IsNullOrWhiteSpace(googleClientId)|| string.IsNullOrWhiteSpace(googleClientSecret))
		{
			throw new InvalidOperationException(
				"Google authentication is enabled but its credentials are missing.");
		}
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
				ClockSkew = TimeSpan.Zero,
				NameClaimType = ClaimTypes.NameIdentifier
			}; 
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? context.Principal?.FindFirstValue("sub");
                    if (string.IsNullOrEmpty(userId)) { context.Fail("Invalid account."); return; }
                    var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();
                    var user = await unitOfWork.User.GetAsync(u => u.Id == userId,
                        cancellationToken: context.HttpContext.RequestAborted);
                    if (user == null) { context.Fail("Account not found."); return; }
                    var registrationPolicy = context.HttpContext.RequestServices.GetRequiredService<IAccountRegistrationPolicy>();
                    try { registrationPolicy.EnsureCanSignIn(user); }
                    catch (UnauthorizedAccessException ex) { context.Fail(ex.Message); }
                }
            };
		})
	   .AddGoogle(options =>
	   {
		   options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
		   options.ClientId = googleClientId;
		   options.ClientSecret = googleClientSecret;
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
