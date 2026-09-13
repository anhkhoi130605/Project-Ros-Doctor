using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using MediatR;
using Application.DTOs.Authentication;

namespace Application.Features.Authentication.Login.Handler
{
	public record GoogleLoginCommand(ClaimsPrincipal Principal) : IRequest<LoginResponseDTO>;
}
