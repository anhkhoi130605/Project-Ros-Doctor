using Application.Features.SystemLog.DTOs;
using MediatR;
using System.Collections.Generic;

namespace Application.Features.SystemLog.Queries
{
    public record GetSystemLogsQuery(
        string? Search = null,
        string? LogLevel = null,
        string? ExceptionType = null,
        int PageIndex = 1,
        int PageSize = 20
    ) : IRequest<SystemLogsResultDto>;

    public class SystemLogsResultDto
    {
        public List<SystemErrorLogDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / (PageSize > 0 ? PageSize : 20));
    }
}
