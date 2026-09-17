using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using API.Controller.Common;
using Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser;

namespace API.Controller.RoleForUser.InClubController.AdminController
{
	[Route("api/[controller]")]
	[ApiController]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
	public class AdminController : BaseController
	{
		private readonly IMediator _mediator;

		public AdminController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet("members")]
		public async Task<IActionResult> GetMembers()
		{
			var query = new GetMembersQuery();
			var result = await _mediator.Send(query);
			return Ok(result);
		}

		[HttpGet("profile/{id}")]
		public async Task<IActionResult> GetAdminProfile(string id)
		{
			// 1. Đóng gói tham số vào Query
			var query = new GetAdminProfileQuery(id);
			// 2. Ném cho Mediator tự tìm đúng Handler để chạy
			var result = await _mediator.Send(query);
			// 3. Xử lý kết quả trả về cho Frontend
			if (result == null)
			{
				return NotFound(new { message = "User not found." });
			}
			return Ok(result);
		}
	}
}
