using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Domain.Entities.AboutUser;

namespace Infrastructure.Persistence;

public partial class AppDbContext : DbContext
{
    private readonly IConfiguration? _configuration;

    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Constructor used when resolving IConfiguration from DI
    public AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration)
        : base(options)
    {
        _configuration = configuration;
    }

    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<Role> Roles { get; set; }
	public virtual DbSet<UserActivityLog> UserActivityLogs { get; set; }

	protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Try to get connection string from injected IConfiguration
            var connectionString = _configuration?.GetConnectionString("DefaultConnection");

            // Fallback to environment variable
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            }

            // Fallback to reading appsettings.json manually (no extra packages required)
            if (string.IsNullOrEmpty(connectionString))
            {
                try
                {
                    var path = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection) &&
                            connSection.TryGetProperty("DefaultConnection", out var defaultConn))
                        {
                            connectionString = defaultConn.GetString();
                        }
                    }
                }
                catch
                {
                    // ignore parsing errors and fall through
                }
            }

            if (!string.IsNullOrEmpty(connectionString))
            {
                optionsBuilder.UseMySql(connectionString, Microsoft.EntityFrameworkCore.ServerVersion.Parse("8.4.8-mysql"));
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.UserConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.RoleConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.UserConfiguration.UserActivityLogConfiguration());
       
		OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
