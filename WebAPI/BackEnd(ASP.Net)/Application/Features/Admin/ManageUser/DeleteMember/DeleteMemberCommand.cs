using Application.Common.Helpers;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Identity;
using MediatR;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.DeleteMember;

public record DeleteMemberCommand(string UserId, string ActorUserId) : IRequest<bool>;

public class DeleteMemberCommandHandler(IUnitOfWork unitOfWork, IAccountRegistrationPolicy accountRegistrationPolicy) : IRequestHandler<DeleteMemberCommand, bool>
{
    public async Task<bool> Handle(DeleteMemberCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.ActorUserId))
            throw new ArgumentException("ID tài khoản không hợp lệ.");
        using (await ConcurrencyLockManager.LockAsync("admin:delete-member", TimeSpan.FromSeconds(10), cancellationToken))
        {
            var actor = await unitOfWork.User.GetAsync(u => u.Id == request.ActorUserId, cancellationToken: cancellationToken)
                ?? throw new UnauthorizedAccessException("Không tìm thấy tài khoản người thực hiện.");
            accountRegistrationPolicy.EnsureCanSignIn(actor);
            var actorRole = await unitOfWork.Roles.GetAsync(r => r.Id == actor.RoleId, cancellationToken: cancellationToken);
            if (actorRole?.RoleName != RoleEnum.Admin)
                throw new UnauthorizedAccessException("Chỉ Admin được xóa thành viên.");
            if (request.UserId == request.ActorUserId)
                throw new InvalidOperationException("Không thể tự xóa tài khoản Admin đang đăng nhập.");
            var user = await unitOfWork.User.GetAsync(u => u.Id == request.UserId, cancellationToken: cancellationToken)
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên cần xóa.");
            if (user.DeletedAt != null) return true; // Safe retry after an acknowledged/lost response.

            var targetRole = await unitOfWork.Roles.GetAsync(r => r.Id == user.RoleId, cancellationToken: cancellationToken);
            if (targetRole?.RoleName == RoleEnum.Admin)
            {
                var adminRoles = await unitOfWork.Roles.GetAllAsync(r => r.RoleName == RoleEnum.Admin, cancellationToken: cancellationToken);
                var adminRoleIds = adminRoles.Select(r => r.Id).ToHashSet();
                var availableAdmins = await unitOfWork.User.GetAllAsync(u => u.Id != user.Id && u.DeletedAt == null
                    && u.IsBanned != true && (u.Status == null || u.Status == UserStatusEnum.Active), cancellationToken: cancellationToken);
                if (!availableAdmins.Any(u => adminRoleIds.Contains(u.RoleId)))
                    throw new InvalidOperationException("Không thể xóa Admin hoạt động cuối cùng của hệ thống.");
            }

            // Preserve report ownership and audit history; do not cascade-delete associated records.
            user.DeletedAt = DateTime.UtcNow;
            user.UpdatedAt = user.DeletedAt.Value;
            user.UpdatedBy = request.ActorUserId;
            user.Status = UserStatusEnum.Inactive;
            await unitOfWork.User.UpdateAsync(user, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
