using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using Domain.Enums;
using DomainUser = Domain.Entities.AboutUser.User;
using DomainRole = Domain.Entities.AboutUser.Role;
using static Domain.Enums.UserEnum;

namespace Application.Features.Authentication.Login.Handler
{
    public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, LoginResponseDTO>
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IJWTTokenGenerator _jwtTokenGenerator;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IUserActivityLogService _userActivityLogService;
        public GoogleLoginCommandHandler(IUnitOfWork unitOfWork, IJWTTokenGenerator jwtTokenGenerator, IPasswordHasher passwordHasher, IUserActivityLogService userActivityLogService)
        {
            _unitOfWork = unitOfWork;
            _jwtTokenGenerator = jwtTokenGenerator;
            _passwordHasher = passwordHasher;
            _userActivityLogService = userActivityLogService;
		}

        public async Task<LoginResponseDTO> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
        {
            var principal = request.Principal;

            // Extract email
            var email = principal.FindFirst(ClaimTypes.Email)?.Value ?? principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value;
            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Không lấy được email từ Google.");

            // Try find existing user
            var user = await _unitOfWork.User.FindByEmailAsync(email);

            if (user == null)
            {
                // Create default role if missing
                var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == RoleEnum.User);
                if (roleEntity == null)
                {
                    roleEntity = new DomainRole { RoleName = RoleEnum.User };
                    await _unitOfWork.Roles.CreateAsync(roleEntity);
                    await _unitOfWork.SaveChangesAsync();
                }

                // Generate a temporary random password so the user can log in later with email/password if needed.
                var temporaryPassword = Guid.NewGuid().ToString("N").Substring(0, 12);

                user = new DomainUser
                {
                    Email = email,
                    FullName = principal.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty,
                    PasswordHash = _passwordHasher.HashPassword(temporaryPassword),
                    RoleId = roleEntity.Id,
                    Role = roleEntity,
                };

                await _unitOfWork.User.CreateAsync(user);
                await _unitOfWork.SaveChangesAsync();
            }

            var roleName = user.Role?.RoleName?.ToString() ?? RoleEnum.User.ToString();
            var accessToken = _jwtTokenGenerator.GenerateToken(user.Id, user.Email, new List<string> { roleName});

            await _userActivityLogService.LogActivityAsync(
                user.Id,
                UserActionType.Login,
                targetId: user.Id,
                targetType: TargetType.User,
                description: "User logged in successfully via Google",
                requestPath: "/api/auth/google-login-response",
                httpMethod: "GET");

            return new LoginResponseDTO
            {
                AccessToken = accessToken,
                User = new LoggedinUserDTO
                {
                    Id = user.Id,
                    Email = user.Email,
                    FullName = user.FullName,
                    Role = user.Role?.RoleName.ToString() ?? string.Empty,
                }
            };
        }
    }
}
