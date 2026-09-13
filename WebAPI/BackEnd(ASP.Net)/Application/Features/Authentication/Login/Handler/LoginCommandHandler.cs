using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Authentication.Login.Handler
{
	public record LoginCommand(LoginRequestDTO Request) : IRequest<LoginResponseDTO>;
    public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponseDTO>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IJWTTokenGenerator _jwtTokenGenerator;
		private readonly IPasswordHasher passwordHasher;

		// 1. Inject UnitOfWork (quản lý DB) và JwtTokenGenerator (tầng Infrastructure) vào qua Constructor
		public LoginCommandHandler(IUnitOfWork unitOfWork, IJWTTokenGenerator jwtTokenGenerator, IPasswordHasher passwordHasher)
		{
			_unitOfWork = unitOfWork;
			_jwtTokenGenerator = jwtTokenGenerator;
			this.passwordHasher = passwordHasher;
		}

		// 2. Hàm Handle xử lý logic nghiệp vụ đăng nhập
		public async Task<LoginResponseDTO> Handle(LoginCommand request, CancellationToken cancellationToken)
		{
			// Bước A: Kiểm tra xem User có tồn tại trong cơ sở dữ liệu dựa trên Email truyền vào không
			// (Hàm FindByEmailAsync này bạn cần khai báo trong UserRepository nhé)
			var user = await _unitOfWork.User.FindByEmailAsync(request.Request.Email);

			// Bước B: Kiểm tra mật khẩu (Đây là ví dụ kiểm tra thô, nếu bạn có mã hóa/hash thì gọi hàm verify ở đây)
			if (user == null || !passwordHasher.VerifyPassword(request.Request.Password, user.PasswordHash))
			{
				throw new ArgumentException("Tài khoản hoặc mật khẩu không chính xác.");
			}

            // Bước C: Đúng tài khoản mật khẩu -> Gọi Service để sinh chuỗi ký số JWT Access Token
            // IJWTTokenGenerator now accepts string role names
			var roles = new[] { user.Role?.RoleName.ToString() ?? string.Empty };
			var accessToken = _jwtTokenGenerator.GenerateToken(user.Id, user.Email, roles);
			var refreshToken = Guid.NewGuid().ToString(); // Sinh tạm một chuỗi ngẫu nhiên làm Refresh Token

			// Bước D: Đóng gói toàn bộ kết quả trả về đúng định dạng cấu trúc LoginResponseDTO của bạn
			return new LoginResponseDTO
			{
				AccessToken = accessToken,
				RefreshToken = refreshToken,
				User = new LoggedinUserDTO
				{
					// Đoạn này map dữ liệu từ Entity User của bạn sang DTO
					// Ví dụ: 
					// Id = user.Id,
					// Email = user.Email
					Id = user.Id,
					Email = user.Email,
                    Role = user.Role?.RoleName.ToString() ?? string.Empty,
					FullName = user.FullName,
					MemberInOrOutClub = user.MemberInOrOutClub,
				}
			};
		}
	}
}
