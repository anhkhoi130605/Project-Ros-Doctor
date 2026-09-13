using MediatR;
using Application.DTOs.Authentication.Register;
using Application.Features.Authentication.Register;

namespace Application.Features.Authentication.Register.Handler;

public record RegisterCommand(RegisterUserRequestDTO Request) : IRequest<RegisterResponse>;
