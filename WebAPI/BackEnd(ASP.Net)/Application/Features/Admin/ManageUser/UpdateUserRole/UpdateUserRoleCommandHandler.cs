using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.ManageTransaction;
using DomainRole = Domain.Entities.Identity.Role;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.UpdateUserRole
{
	public class UpdateUserRoleCommandHandler : IRequestHandler<UpdateUserRoleCommand, bool>
	{
		private readonly IUnitOfWork _unitOfWork;

		public UpdateUserRoleCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<bool> Handle(UpdateUserRoleCommand request, CancellationToken cancellationToken)
		{
			if (string.IsNullOrWhiteSpace(request.UserId))
				throw new ArgumentException("ID thành viên không được để trống.", nameof(request.UserId));

			// 1. Tìm user trong cơ sở dữ liệu
			var user = await _unitOfWork.User.GetAsync(u => u.Id == request.UserId || u.Email == request.UserId, cancellationToken: cancellationToken);
			if (user == null)
			{
				throw new KeyNotFoundException($"Không tìm thấy thành viên với Id/Email: {request.UserId}");
			}

			// 2. Tìm hoặc tạo Role entity tương ứng với Enum requested
			var roleEntity = await _unitOfWork.Roles.GetAsync(r => r.RoleName == request.Role, cancellationToken: cancellationToken);
			if (roleEntity == null)
			{
				roleEntity = new DomainRole { RoleName = request.Role };
				await _unitOfWork.Roles.CreateAsync(roleEntity, cancellationToken);
				await _unitOfWork.SaveChangesAsync();
			}

			// Nếu vai trò không thay đổi
			if (user.RoleId == roleEntity.Id)
			{
				return true;
			}

			// 3. Kiểm tra bảo mật: Ngăn việc giáng cấp Admin duy nhất còn lại của hệ thống
			var currentRole = await _unitOfWork.Roles.GetAsync(r => r.Id == user.RoleId, cancellationToken: cancellationToken);
			if (currentRole?.RoleName == RoleEnum.Admin && request.Role != RoleEnum.Admin)
			{
				var allUsers = await _unitOfWork.User.GetAllAsync(cancellationToken: cancellationToken);
				var allRoles = await _unitOfWork.Roles.GetAllAsync(cancellationToken: cancellationToken);

				var adminRoleIds = allRoles
					.Where(r => r.RoleName == RoleEnum.Admin)
					.Select(r => r.Id)
					.ToHashSet();

				var otherAdminCount = allUsers.Count(u => u.Id != user.Id && adminRoleIds.Contains(u.RoleId));
				if (otherAdminCount == 0)
				{
					throw new InvalidOperationException("BẢO MẬT: Không thể giáng cấp Quản trị viên (Admin) duy nhất còn lại của hệ thống!");
				}
			}

			// 4. Cập nhật thông tin vai trò
			user.RoleId = roleEntity.Id;
			user.Role = roleEntity;
			user.UpdatedAt = DateTime.UtcNow;

			await _unitOfWork.User.UpdateAsync(user, cancellationToken);
			await _unitOfWork.SaveChangesAsync();

			return true;
		}
	}
}
