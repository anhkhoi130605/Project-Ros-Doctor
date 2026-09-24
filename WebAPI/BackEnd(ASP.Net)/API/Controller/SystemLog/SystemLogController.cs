using Application.Features.SystemLog.Commands;
using Application.Features.SystemLog.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace API.Controller.SystemLog
{
    [ApiController]
    [Route("api/system-logs")]
    public class SystemLogController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SystemLogController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] string? search = null,
            [FromQuery] string? logLevel = null,
            [FromQuery] string? exceptionType = null,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _mediator.Send(new GetSystemLogsQuery(
                Search: search,
                LogLevel: logLevel,
                ExceptionType: exceptionType,
                PageIndex: pageIndex,
                PageSize: pageSize
            ));

            return Ok(result);
        }

        [HttpPost("trigger-test-error")]
        public async Task<IActionResult> TriggerTestError([FromBody] TriggerTestErrorRequest? request)
        {
            var errorType = request?.ErrorType ?? "ArgumentException";
            var message = request?.Message;

            // This command will deliberately throw the exception so that GlobalExceptionMiddleware catches, logs, translates, and persists it.
            await _mediator.Send(new TriggerTestErrorCommand(errorType, message));
            return Ok(new { success = true, message = "Test completed successfully." });
        }
    }

    public class TriggerTestErrorRequest
    {
        public string? ErrorType { get; set; } = "ArgumentException";
        public string? Message { get; set; }
    }
}
