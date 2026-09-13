using System.Security.Claims;
using MediatR;
using Domain.Entities.AboutUser;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentication;
using Application.Interfaces.ManageTrancsaction;
using static Domain.Enums.UserEnum;
using Application.DTOs.Authentication.Register;

namespace Application.Features.Authentication.Register.Handler;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResponse>
{
	private readonly IUnitOfWork _unitOfWork;
    private readonly IJWTTokenGenerator _jwtTokenGenerator;
	private readonly IPasswordHasher _passwordHasher;
	public RegisterCommandHandler(IUnitOfWork unitOfWork, IJWTTokenGenerator jwtTokenGenerator, IPasswordHasher passwordHasher)
	{
		_unitOfWork = unitOfWork;
		_jwtTokenGenerator = jwtTokenGenerator;
		_passwordHasher = passwordHasher;
	}

    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
	{
        // 1. Lấy dữ liệu từ DTO
        var dto = request.Request;
		var email = dto.Email;
		var name = dto.FullName;
		if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(dto.Password))
		{
			throw new Exception("Email hoặc mật khẩu không hợp lệ.");
		}

		string securedPassword = _passwordHasher.HashPassword(dto.Password);

        // 2. Kiểm tra xem Email hoặc StudentId này đã được ai đăng ký trong DB chưa
		var existingUser = await _unitOfWork.User.FindByEmailAsync(email);
		if (!string.IsNullOrWhiteSpace(dto.StudentId))
		{
			var existsStudent = await _unitOfWork.User.ExistsStudentIdAsync(dto.StudentId);
			if (existsStudent)
				throw new Exception("Mã sinh viên đã tồn tại.");
		}

		if (existingUser != null)
		{
			// Nếu đã có tài khoản, không cho đăng ký trùng, bắt họ quay lại trang Login
			throw new Exception("Tài khoản email này đã tồn tại trên hệ thống. Vui lòng sử dụng tính năng Đăng nhập.");
		}

		// 3. Nếu chưa có -> Tiến hành tạo User mới hoàn toàn (Đăng ký thành công)
		// Lấy role mặc định từ DB (hoặc tạo nếu chưa tồn tại)
        var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == RoleEnum.User);
		if (roleEntity == null)
		{
			roleEntity = new Role { RoleName = RoleEnum.User };
			await _unitOfWork.Roles.CreateAsync(roleEntity);
			// Lưu để có Id
			await _unitOfWork.SaveChangesAsync();
		}
        var newUser = new User
		{
			Email = email,
			FullName = name ?? string.Empty,
            PasswordHash = securedPassword, // store raw for now (replace with hash in production)
			RoleId = roleEntity.Id,
			Role = roleEntity,
            // Store full student id string if provided
			StudentId = string.IsNullOrWhiteSpace(dto.StudentId) ? string.Empty : dto.StudentId.ToUpperInvariant(),
			MemberInOrOutClub = MemberInOrOutClubEnum.OutClub, // Mặc định là chưa tham gia câu lạc bộ
		};

		await _unitOfWork.User.CreateAsync(newUser);
		await _unitOfWork.SaveChangesAsync();

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