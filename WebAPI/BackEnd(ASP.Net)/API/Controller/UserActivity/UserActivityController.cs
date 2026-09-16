using Application.Features.UserActivity.Queries;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.UserActivity
{
    [ApiController]
    [Route("api/user-activity")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class UserActivityController : ControllerBase
    {
        private readonly IMediator _mediator;

        public UserActivityController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? userId = null, [FromQuery] string? action = null, [FromQuery] int take = 20)
        {
            if (take <= 0) take = 20;
            if (take > 100) take = 100;

            var result = await _mediator.Send(new GetUserActivityQuery(userId, action, take));
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("Log id is required.");
            }

            var result = await _mediator.Send(new GetUserActivityByIdQuery(id));
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
    }
}
