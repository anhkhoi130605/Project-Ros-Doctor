using MediatR;

namespace Application.Features.SystemLog.Commands
{
    public record TriggerTestErrorCommand(string ErrorType = "ArgumentException", string? CustomMessage = null) : IRequest<bool>;
}
