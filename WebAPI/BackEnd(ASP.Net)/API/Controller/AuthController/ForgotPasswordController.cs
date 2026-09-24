using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Application.Features.Authentication.Password;
using Application.Features.Authentication.Password.Handler;

namespace API.Controller.AuthController
{
	[ApiController]
	[Route("api/auth")]
	public class ForgotPasswordController : ControllerBase
	{
		private readonly IMediator _mediator;

		public ForgotPasswordController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpPost("forgot-password")]
		public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDTO request)
		{
			if (!ModelState.IsValid) return BadRequest(ModelState);

			var command = new ForgotPasswordCommand(request);
			var response = await _mediator.Send(command);

			if (!response.Success) return BadRequest(response);
			return Ok(response);
		}

		[HttpPost("reset-password")]
		public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDTO request)
		{
			if (!ModelState.IsValid) return BadRequest(ModelState);

			var command = new ResetPasswordCommand(request);
			var response = await _mediator.Send(command);

			if (!response.Success) return BadRequest(response);
			return Ok(response);
		}
	}
}
