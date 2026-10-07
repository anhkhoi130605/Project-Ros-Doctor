using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using API.Controller.Common;
using Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser;
using Application.Features.Admin.ManageUser.UpdateUserRole;
using Domain.Enums;
using static Domain.Enums.UserEnum;

namespace API.Controller.RoleForUser.InClubController.AdminController
{
	[Route("api/[controller]")]
	[ApiController]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
	[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
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

		[HttpPut("members/{id}/role")]
		[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
		public async Task<IActionResult> UpdateMemberRole(string id, [FromBody] UpdateUserRoleRequestDto request)
		{
			if (request == null || string.IsNullOrWhiteSpace(request.Role))
			{
				return BadRequest(new { message = "Vai trò mới không được để trống." });
			}

			if (!Enum.TryParse<RoleEnum>(request.Role, true, out var parsedRole))
			{
				return BadRequest(new { message = $"Vai trò [{request.Role}] không hợp lệ." });
			}

			var command = new UpdateUserRoleCommand
			{
				UserId = id,
				Role = parsedRole
			};

			var result = await _mediator.Send(command);
			if (result)
			{
				await ExecuteSuccessAsync(
					$"Đã cập nhật vai trò của thành viên sang [{request.Role}]",
					UserActionType.AssignRole,
					targetId: id,
					targetType: TargetType.User
				);
				return Ok(new { message = "Cập nhật vai trò thành công." });
			}

			return BadRequest(new { message = "Không thể cập nhật vai trò." });
		}
	}
}
