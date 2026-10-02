using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities.Identity;
using static Domain.Enums.UserEnum;

namespace Application.Interfaces.ManageForRole
{
	/// <summary>
	/// Hợp đồng nghiệp vụ quản lý và kiểm tra quyền truy cập (Policy) của tài khoản
	/// </summary>
	public interface IAccountPolicyService
	{
		/// <summary>
		/// Kiểm tra xem User có quyền (Policy) cụ thể hay không (ưu tiên AccountPolicy trong DB, fallback về Role mặc định)
		/// </summary>
		Task<bool> HasPolicyAsync(string userId, string policyName, CancellationToken cancellationToken = default);

		/// <summary>
		/// Lấy toàn bộ danh sách các Policy có hiệu lực của User (bao gồm quyền theo Role + quyền gán riêng - quyền bị deny)
		/// </summary>
		Task<IReadOnlyList<string>> GetEffectivePoliciesAsync(string userId, CancellationToken cancellationToken = default);

		/// <summary>
		/// Khởi tạo các quyền mặc định vào DB cho User theo vai trò Role
		/// </summary>
		Task AssignDefaultPoliciesAsync(string userId, RoleEnum role, CancellationToken cancellationToken = default);

		/// <summary>
		/// Thiết lập quy tắc quyền cụ thể cho User (ví dụ rule: "allow", "deny")
		/// </summary>
		Task SetPolicyRuleAsync(string userId, string policyName, string rule, CancellationToken cancellationToken = default);

		/// <summary>
		/// Thu hồi một quyền riêng biệt của User
		/// </summary>
		Task RemovePolicyAsync(string userId, string policyName, CancellationToken cancellationToken = default);
	}
}
