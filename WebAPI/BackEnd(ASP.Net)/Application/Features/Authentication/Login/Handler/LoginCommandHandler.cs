using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTransaction;
using Domain.Enums;

namespace Application.Features.Authentication.Login.Handler
{
	public record LoginCommand(LoginRequestDTO Request) : IRequest<LoginResponseDTO>;
    public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponseDTO>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IJWTTokenGenerator _jwtTokenGenerator;
		private readonly IPasswordHasher passwordHasher;
		private readonly IUserActivityLogService _userActivityLogService;

		// 1. Inject UnitOfWork (quản lý DB) và JwtTokenGenerator (tầng Infrastructure) vào qua Constructor
		public LoginCommandHandler(IUnitOfWork unitOfWork, IJWTTokenGenerator jwtTokenGenerator, IPasswordHasher passwordHasher, IUserActivityLogService userActivityLogService)
		{
			_unitOfWork = unitOfWork;
			_jwtTokenGenerator = jwtTokenGenerator;
			this.passwordHasher = passwordHasher;
			_userActivityLogService = userActivityLogService;
		}

		// 2. Hàm Handle xử lý logic nghiệp vụ đăng nhập
		public async Task<LoginResponseDTO> Handle(LoginCommand request, CancellationToken cancellationToken)
		{
			// Bước A: Kiểm tra xem User có tồn tại trong cơ sở dữ liệu dựa trên Email truyền vào không
			var user = await _unitOfWork.User.FindByEmailAsync(request.Request.Email, cancellationToken);

			// Bước B: Kiểm tra mật khẩu (hỗ trợ tài khoản đăng ký OAuth không có mật khẩu)
			if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !passwordHasher.VerifyPassword(request.Request.Password, user.PasswordHash))
			{
				throw new ArgumentException("Tài khoản hoặc mật khẩu không chính xác.");
			}

            // Bước C: Đúng tài khoản mật khẩu -> Gọi Service để sinh chuỗi ký số JWT Access Token
            // IJWTTokenGenerator now accepts string role names
			var roles = new[] { user.Role?.RoleName.ToString() ?? string.Empty };
			var accessToken = _jwtTokenGenerator.GenerateToken(user.Id, user.Email, roles);
			var refreshToken = Guid.NewGuid().ToString(); // Sinh tạm một chuỗi ngẫu nhiên làm Refresh Token

			await _userActivityLogService.LogActivityAsync(
				user.Id,
				UserActionType.Login,
				targetId: user.Id,
				targetType: TargetType.User,
				description: "User logged in successfully",
				requestPath: "/api/auth/login",
				httpMethod: "POST",
				userName: user.FullName ?? user.Email,
				email: user.Email);

			// Bước D: Đóng gói toàn bộ kết quả trả về đúng định dạng cấu trúc LoginResponseDTO của bạn
			return new LoginResponseDTO
			{
				AccessToken = accessToken,
				RefreshToken = refreshToken,
				User = new LoggedinUserDTO
				{
					Id = user.Id,
					Email = user.Email,
					FullName = user.FullName ?? string.Empty,
					AvatarUrl = user.AvatarUrl,
					Role = user.Role?.RoleName.ToString() ?? string.Empty
				}
			};
		}
	}
}
