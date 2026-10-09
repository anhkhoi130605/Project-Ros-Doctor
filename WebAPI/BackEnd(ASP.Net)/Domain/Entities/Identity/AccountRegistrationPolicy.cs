using static Domain.Enums.UserEnum;

namespace Domain.Entities.Identity;

public static class AccountRegistrationPolicy
{
    public static RoleEnum ParseRole(string? role)
    {
        if (string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)) return RoleEnum.User;
        if (string.Equals(role, "Engineering", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(role, "Engineer", StringComparison.OrdinalIgnoreCase)) return RoleEnum.Engineering;
        throw new ArgumentException("Chỉ được đăng ký dưới dạng User hoặc Engineer.");
    }

    public static UserStatusEnum InitialStatus(RoleEnum role) => role switch
    {
        RoleEnum.User => UserStatusEnum.Active,
        RoleEnum.Engineering => UserStatusEnum.PendingApproval,
        _ => throw new ArgumentException("Không được tự đăng ký tài khoản Admin.")
    };

    public static void EnsureCanSignIn(User user)
    {
        if (user.DeletedAt != null) throw new UnauthorizedAccessException("Tài khoản đã bị xóa khỏi hệ thống.");
        if (user.Status == UserStatusEnum.PendingApproval) throw new AccountPendingApprovalException();
        if (user.IsBanned == true || user.Status is UserStatusEnum.Banned or UserStatusEnum.Inactive)
            throw new UnauthorizedAccessException("Tài khoản chưa được kích hoạt hoặc đã bị khóa.");
    }
}

public sealed class AccountPendingApprovalException : UnauthorizedAccessException
{
    public const string Code = "ENGINEER_PENDING_APPROVAL";
    public AccountPendingApprovalException() : base("Tài khoản đã được đăng ký, vui lòng đợi Admin duyệt.") { }
}
