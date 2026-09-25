using API.Middlewares;
using API.Middlewares.Extentions;
using Application.Features.Authentication.Login.Handler;
using MediatR;
using ResUpClub.Infrastructure.ConfigModel;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddMediatR(config =>
    config.RegisterServicesFromAssembly(typeof(LoginCommandHandler).Assembly));
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.UseRequestResponseLogging();
app.UseGlobalExceptionMiddleware();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
