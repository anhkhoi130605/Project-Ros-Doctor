using MediatR;
using Application.Features.UserProfile.DTOs;

namespace Application.Features.UserProfile.Queries
{
	public record GetMyProfileQuery(string UserId) : IRequest<UserProfileDto?>;
}
