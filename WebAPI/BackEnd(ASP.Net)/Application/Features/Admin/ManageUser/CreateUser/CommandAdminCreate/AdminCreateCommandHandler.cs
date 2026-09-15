using MediatR;
using Application.Interfaces.ManageTrancsaction;
using Application.Interfaces.Authentication;
using Domain.Entities.AboutUser;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate
{
	public class AdminCreateCommandHandler : IRequestHandler<AdminCreateCommand, AdminCreateDTO>
	{
    private readonly IUnitOfWork _unitOfWork;
	private readonly IPasswordHasher _passwordHasher;
	public AdminCreateCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
	{
		_unitOfWork = unitOfWork;
		_passwordHasher = passwordHasher;
	}
    public async Task<AdminCreateDTO> Handle(AdminCreateCommand request, CancellationToken cancellationToken)
	{
		// 1. Validate input and check existing email
		if (string.IsNullOrWhiteSpace(request.Email))
			throw new ArgumentException("Email is required.", nameof(request.Email));

		var exists = await _unitOfWork.User.ExistsByEmailAsync(request.Email);
		if (exists)
			throw new Exception("Tài khoản email này đã tồn tại trên hệ thống.");


		// 2. Ensure requested Role exists (create if missing)
		var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == request.Role);
		if (roleEntity == null)
		{
			roleEntity = new Role { RoleName = request.Role };
			await _unitOfWork.Roles.CreateAsync(roleEntity);
			await _unitOfWork.SaveChangesAsync();
		}

		// 3. Create new user entity (hash password)
        var newUser = new User
		{
			Email = request.Email,
			FullName = request.FullName,
			PasswordHash = _passwordHasher.HashPassword(request.Password),
			RoleId = roleEntity.Id,
			Role = roleEntity,
			MemberInOrOutClub = (request.Role == RoleEnum.Admin) ? MemberInOrOutClubEnum.InClub : MemberInOrOutClubEnum.OutClub,
			Gender = request.Gender
		};

		await _unitOfWork.User.CreateAsync(newUser);
		await _unitOfWork.SaveChangesAsync();

        // 4. Map to DTO and return
		return new AdminCreateDTO
		{
			Email = newUser.Email,
			PasswordHash = newUser.PasswordHash,
			FullName = newUser.FullName,
			Role = roleEntity.RoleName ?? request.Role,
			Status = UserStatusEnum.Active,
			MemberInOrOutClub = newUser.MemberInOrOutClub,
			Gender = newUser.Gender,
		};
	}
	}
}
