using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using MediatR;
using Application.DTOs.Authentication;
using static Domain.Enums.UserEnum;

namespace Application.Features.Authentication.Login.Handler
{
	public record GoogleLoginCommand(ClaimsPrincipal Principal,
        RoleEnum RegistrationRole = RoleEnum.User, bool IsRegistration = false) : IRequest<LoginResponseDTO>;
}
