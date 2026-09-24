using Application.Features.SystemLog.Commands;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Features.SystemLog.Handlers
{
    public class TriggerTestErrorCommandHandler : IRequestHandler<TriggerTestErrorCommand, bool>
    {
        public Task<bool> Handle(TriggerTestErrorCommand request, CancellationToken cancellationToken)
        {
            var msg = request.CustomMessage ?? $"Kiểm tra lỗi hệ thống loại [{request.ErrorType}] phát sinh lúc {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC.";

            switch (request.ErrorType?.Trim().ToLower())
            {
                case "nullreference":
                case "nullreferenceexception":
                    string? nullObj = null;
                    _ = nullObj!.Length; // Will throw NullReferenceException
                    break;

                case "unauthorized":
                case "unauthorizedaccessexception":
                    throw new UnauthorizedAccessException(msg);

                case "keynotfound":
                case "keynotfoundexception":
                    throw new KeyNotFoundException(msg);

                case "invalidoperation":
                case "invalidoperationexception":
                    throw new InvalidOperationException(msg);

                case "formatexception":
                    throw new FormatException(msg);

                case "timeoutexception":
                    throw new TimeoutException(msg);

                case "notimplemented":
                case "notimplementedexception":
                    throw new NotImplementedException(msg);

                default:
                    throw new ArgumentException(msg);
            }

            return Task.FromResult(true);
        }
    }
}
