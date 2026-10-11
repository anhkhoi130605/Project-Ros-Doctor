using AutoMapper;
using Microsoft.Extensions.DependencyInjection;

namespace Application;

public static class DependencyInjection
{
	public static IServiceCollection AddApplicationServices(this IServiceCollection services)
	{
		// 1. Register MediatR: scan Application assembly for all Commands, Queries, and Handlers
		services.AddMediatR(config =>
			config.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

		// 2. Register AutoMapper: scan Application assembly for all Mapping Profiles
		services.AddAutoMapper(cfg =>
			cfg.AddMaps(typeof(DependencyInjection).Assembly));
		return services;
	}
}
