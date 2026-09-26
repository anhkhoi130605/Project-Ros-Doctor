using System.Security.Claims;
using MediatR;
using DomainUser = Domain.Entities.AboutUser.User;
using DomainRole = Domain.Entities.AboutUser.Role;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTrancsaction;
using static Domain.Enums.UserEnum;
using Application.DTOs.Authentication.Register;
using Domain.Enums;

namespace Application.Features.Authentication.Register.Handler;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResponse>
{
	private readonly IUnitOfWork _unitOfWork;
    private readonly IJWTTokenGenerator _jwtTokenGenerator;
	private readonly IPasswordHasher _passwordHasher;
	private readonly IUserActivityLogService _userActivityLogService;
	public RegisterCommandHandler(IUnitOfWork unitOfWork, IJWTTokenGenerator jwtTokenGenerator, IPasswordHasher passwordHasher, IUserActivityLogService userActivityLogService)
	{
		_unitOfWork = unitOfWork;
		_jwtTokenGenerator = jwtTokenGenerator;
		_passwordHasher = passwordHasher;
		_userActivityLogService = userActivityLogService;
	}

    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
	{
        // 1. Lấy dữ liệu từ DTO
        var dto = request.Request;
		var email = dto.Email;
		var name = dto.FullName;
		if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(dto.Password))
		{
			throw new ArgumentException("Email hoặc mật khẩu không hợp lệ.");
		}

		// Khóa chống Race Condition theo email: nếu 2 request cùng email gửi tới cùng lúc, luồng sau sẽ chờ luồng trước hoàn tất
		using (await Application.Common.Helpers.ConcurrencyLockManager.LockAsync($"register:{email.Trim().ToLowerInvariant()}", TimeSpan.FromSeconds(10), cancellationToken))
		{
			string securedPassword = _passwordHasher.HashPassword(dto.Password);

			// 2. Kiểm tra email đã được đăng ký trong DB chưa
			var existingUser = await _unitOfWork.User.FindByEmailAsync(email, cancellationToken);

			if (existingUser != null)
			{
				throw new InvalidOperationException("Tài khoản email này đã tồn tại trên hệ thống. Vui lòng sử dụng tính năng Đăng nhập.");
			}

			// 3. Nếu chưa có -> Tiến hành tạo User mới hoàn toàn (Đăng ký thành công)
			var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == RoleEnum.User, null, cancellationToken);
			if (roleEntity == null)
			{
				roleEntity = new DomainRole { RoleName = RoleEnum.User };
				await _unitOfWork.Roles.CreateAsync(roleEntity, cancellationToken);
				await _unitOfWork.SaveChangesAsync(cancellationToken);
			}

			var newUser = new DomainUser
			{
				Email = email,
				FullName = name ?? string.Empty,
				PasswordHash = securedPassword,
				RoleId = roleEntity.Id,
				Role = roleEntity,
				Phone = dto.Phone,
				Gender = dto.Gender,
				DateOfBirth = dto.DateOfBirth,
				Bio = dto.Bio,
				Status = UserStatusEnum.Active,
				IsBanned = false,
			};

			await _unitOfWork.User.CreateAsync(newUser, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			await _userActivityLogService.LogActivityAsync(
				newUser.Id,
				UserActionType.Register,
				targetId: newUser.Id,
				targetType: TargetType.User,
				description: "User registered a new account",
				requestPath: "/api/auth/register",
				httpMethod: "POST",
				userName: newUser.FullName ?? newUser.Email,
				email: newUser.Email);

			// 4. Sinh Token JWT lập tức để người dùng đăng ký xong là tự động vào app luôn
			var roleName = roleEntity.RoleName?.ToString() ?? RoleEnum.User.ToString();
			var accessToken = _jwtTokenGenerator.GenerateToken(newUser.Id, newUser.Email, new List<string> { roleName });

			return new RegisterResponse
			{
				AccessToken = accessToken,
				User = new RegisterUserRequestDTO { Email = newUser.Email, FullName = newUser.FullName }
			};
		}
    }
}