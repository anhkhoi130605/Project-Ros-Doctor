using MediatR;
using Application.Interfaces.ManageTransaction;
using Application.Common.Helpers;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.ApproveEngineer;

public record ApproveEngineerCommand(string UserId) : IRequest<bool>;

public class ApproveEngineerCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<ApproveEngineerCommand, bool>
{
    public async Task<bool> Handle(ApproveEngineerCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId)) throw new ArgumentException("ID thành viên không được để trống.");
        using (await ConcurrencyLockManager.LockAsync($"approve-engineer:{request.UserId}", TimeSpan.FromSeconds(10), cancellationToken))
        {
            var user = await unitOfWork.User.GetAsync(u => u.Id == request.UserId, cancellationToken: cancellationToken)
                ?? throw new KeyNotFoundException("Không tìm thấy tài khoản Engineer.");
            var role = await unitOfWork.Roles.GetAsync(r => r.Id == user.RoleId, cancellationToken: cancellationToken);
            if (role?.RoleName != RoleEnum.Engineering || user.IsBanned == true || user.DeletedAt != null)
                throw new InvalidOperationException("Chỉ được duyệt tài khoản Engineer đang chờ duyệt và chưa bị khóa.");
            // Cho phép request lặp sau khi duyệt thành công; không kích hoạt tài khoản bị khóa/inactive.
            if (user.Status == UserStatusEnum.Active) return true;
            if (user.Status != UserStatusEnum.PendingApproval)
                throw new InvalidOperationException("Tài khoản không ở trạng thái chờ duyệt.");
            user.Status = UserStatusEnum.Active;
            user.UpdatedAt = DateTime.UtcNow;
            await unitOfWork.User.UpdateAsync(user, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
