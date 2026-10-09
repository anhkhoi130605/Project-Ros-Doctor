using System.Security.Claims;
using MediatR;
using DomainUser = Domain.Entities.Identity.User;
using DomainRole = Domain.Entities.Identity.Role;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTransaction;
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
        var requestedRole = Domain.Entities.Identity.AccountRegistrationPolicy.ParseRole(dto.Role);
		var email = dto.Email?.Trim();
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
			var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == requestedRole, null, cancellationToken);
			if (roleEntity == null)
			{
				roleEntity = new DomainRole { RoleName = requestedRole };
				await _unitOfWork.Roles.CreateAsync(roleEntity, cancellationToken);
				await _unitOfWork.SaveChangesAsync(cancellationToken);
			}

			var newUser = new DomainUser
			{
				Email = email,
				FullName = name ?? string.Empty,
				PasswordHash = securedPassword,
				// Chỉ gán khóa ngoại: Role từ GetAsync là detached, gắn navigation sẽ khiến EF thêm lại Role đã tồn tại.
				RoleId = roleEntity.Id,
				Phone = dto.Phone,
				Gender = dto.Gender,
				DateOfBirth = dto.DateOfBirth,
				Bio = dto.Bio,
				Status = Domain.Entities.Identity.AccountRegistrationPolicy.InitialStatus(requestedRole),
				IsBanned = false,
			};

			await _unitOfWork.User.CreateAsync(newUser, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			await _userActivityLogService.LogActivityAsync(
				newUser.Id,
				UserActionType.Register,
				targetId: newUser.Id,
				targetType: TargetType.User,
				description: requestedRole == RoleEnum.Engineering
                    ? "Engineer registered an account awaiting admin approval"
                    : "User registered a new account",
				requestPath: "/api/auth/register",
				httpMethod: "POST",
				userName: newUser.FullName ?? newUser.Email,
				email: newUser.Email);

			// Chỉ User được nhận token ngay. Engineer chờ Admin duyệt ở server.
			var roleName = roleEntity.RoleName?.ToString() ?? RoleEnum.User.ToString();
            var requiresApproval = newUser.Status == UserStatusEnum.PendingApproval;
			var accessToken = requiresApproval ? null
                : _jwtTokenGenerator.GenerateToken(newUser.Id, newUser.Email, new List<string> { roleName });

			return new RegisterResponse
			{
				AccessToken = accessToken,
                UserId = newUser.Id,
                RequiresApproval = requiresApproval,
				User = new RegisterUserRequestDTO { Email = newUser.Email, FullName = newUser.FullName, Role = roleName }
			};
		}
    }
}
