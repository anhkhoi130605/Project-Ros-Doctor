using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.UserProfile.Commands;
using Application.Features.UserProfile.DTOs;
using Application.Features.UserProfile.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.ProfileController
{
	[Route("api/[controller]")]
	[ApiController]
	[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
	[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
	public class ProfileController : BaseController
	{
		private readonly IMediator _mediator;

		public ProfileController(IMediator mediator)
		{
			_mediator = mediator;
		}

		[HttpGet("me")]
		public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
		{
			if (string.IsNullOrWhiteSpace(CurrentUserId))
			{
				return Unauthorized(new { message = "Vui lòng đăng nhập." });
			}

			var profile = await _mediator.Send(new GetMyProfileQuery(CurrentUserId), cancellationToken);
			if (profile == null)
			{
				return NotFound(new { message = "Không tìm thấy thông tin tài khoản." });
			}

			return Ok(profile);
		}

		[HttpPut("me")]
		public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request, CancellationToken cancellationToken)
		{
			if (string.IsNullOrWhiteSpace(CurrentUserId))
			{
				return Unauthorized(new { message = "Vui lòng đăng nhập." });
			}

			if (request == null || string.IsNullOrWhiteSpace(request.FullName))
			{
				return BadRequest(new { message = "Họ và tên không được để trống." });
			}

			var updatedProfile = await _mediator.Send(new UpdateProfileCommand(CurrentUserId, request), cancellationToken);

			await LogUserActivity(
				UserActionType.UpdateProfile,
				targetId: CurrentUserId,
				targetType: TargetType.User,
				description: $"Người dùng cập nhật thông tin cá nhân ({updatedProfile.FullName})");

			return Ok(updatedProfile);
		}

		[HttpPost("me/avatar")]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> UploadAvatar(IFormFile file, CancellationToken cancellationToken)
		{
			if (string.IsNullOrWhiteSpace(CurrentUserId))
			{
				return Unauthorized(new { message = "Vui lòng đăng nhập." });
			}

			if (file == null || file.Length == 0)
			{
				return BadRequest(new { message = "Vui lòng chọn file hình ảnh hợp lệ." });
			}

			if (file.Length > 10 * 1024 * 1024)
			{
				return BadRequest(new { message = "Dung lượng ảnh tối đa là 10MB." });
			}

			var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
			var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
			if (!allowedExtensions.Contains(extension))
			{
				return BadRequest(new { message = "Định dạng ảnh không được hỗ trợ (chỉ nhận PNG, JPG, WebP, GIF)." });
			}

			await using var stream = file.OpenReadStream();
			var avatarUrl = await _mediator.Send(new UploadAvatarCommand(CurrentUserId, stream, file.FileName), cancellationToken);

			await LogUserActivity(
				UserActionType.UpdateProfile,
				targetId: CurrentUserId,
				targetType: TargetType.User,
				description: "Người dùng cập nhật ảnh đại diện (Cloudinary)");

			return Ok(new { avatarUrl, message = "Cập nhật ảnh đại diện thành công!" });
		}
	}
}
