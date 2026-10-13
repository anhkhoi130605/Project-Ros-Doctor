using System.IO;
using MediatR;

namespace Application.Features.UserProfile.Commands
{
	public record UploadAvatarCommand(string UserId, Stream FileStream, string FileName) : IRequest<string>;
}
