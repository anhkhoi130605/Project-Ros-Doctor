using Application.Features.SystemLog.DTOs;
using Application.Features.SystemLog.Queries;
using Application.Interfaces.ManageTransaction;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Features.SystemLog.Handlers
{
    public class GetSystemLogsQueryHandler : IRequestHandler<GetSystemLogsQuery, SystemLogsResultDto>
    {
        private readonly IUnitOfWork _unitOfWork;

        public GetSystemLogsQueryHandler(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<SystemLogsResultDto> Handle(GetSystemLogsQuery request, CancellationToken cancellationToken)
        {
            var search = request.Search?.Trim().ToLower();
            var logLevel = request.LogLevel?.Trim();
            var exceptionType = request.ExceptionType?.Trim();

            var logs = await _unitOfWork.SystemErrorLogs.GetAllAsync(
                filter: x =>
                    (string.IsNullOrWhiteSpace(logLevel) || x.LogLevel == logLevel) &&
                    (string.IsNullOrWhiteSpace(exceptionType) || x.ExceptionType.Contains(exceptionType)) &&
                    (string.IsNullOrWhiteSpace(search) ||
                     x.ExceptionType.ToLower().Contains(search) ||
                     x.ErrorMessage.ToLower().Contains(search) ||
                     x.TranslatedMessage.ToLower().Contains(search) ||
                     (x.RequestPath != null && x.RequestPath.ToLower().Contains(search))),
                includes: q => q.OrderByDescending(x => x.CreatedAt)
            );

            var list = logs.ToList();
            var totalCount = list.Count;
            var pageIndex = request.PageIndex < 1 ? 1 : request.PageIndex;
            var pageSize = request.PageSize < 1 ? 20 : request.PageSize;

            var paged = list
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new SystemErrorLogDto
                {
                    Id = x.Id,
                    LogLevel = x.LogLevel,
                    ExceptionType = x.ExceptionType,
                    ErrorMessage = x.ErrorMessage,
                    TranslatedMessage = x.TranslatedMessage,
                    StackTrace = x.StackTrace,
                    RequestPath = x.RequestPath,
                    HttpMethod = x.HttpMethod,
                    StatusCode = x.StatusCode,
                    UserId = x.UserId,
                    IpAddress = x.IpAddress,
                    UserAgent = x.UserAgent,
                    CreatedAt = x.CreatedAt
                })
                .ToList();

            return new SystemLogsResultDto
            {
                Items = paged,
                TotalCount = totalCount,
                PageIndex = pageIndex,
                PageSize = pageSize
            };
        }
    }
}
