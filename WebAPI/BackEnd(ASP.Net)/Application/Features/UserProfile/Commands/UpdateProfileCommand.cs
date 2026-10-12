using MediatR;
using Application.Features.UserProfile.DTOs;

namespace Application.Features.UserProfile.Commands
{
	public record UpdateProfileCommand(string UserId, UpdateProfileRequestDto Dto) : IRequest<UserProfileDto>;
}
