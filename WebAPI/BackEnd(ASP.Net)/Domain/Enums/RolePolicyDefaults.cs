using System;
using System.Collections.Generic;
using System.Linq;
using Domain.Entities.Identity;
using static Domain.Enums.UserEnum;

namespace Domain.Enums
{
	/// <summary>
	/// Định nghĩa ma trận chính sách truy cập (Policies) mặc định cho từng Role trong hệ thống
	/// dựa trên các tính năng của Frontend.
	/// </summary>
	public static class RolePolicyDefaults
	{
		/// <summary>
		/// Các quyền mặc định của vai trò User (Người dùng / Viewer)
		/// </summary>
		public static readonly IReadOnlyList<string> UserPolicies = new[]
		{
			UserPolicy.ViewDashboard,
			UserPolicy.ViewSharedBags,
			UserPolicy.ViewApprovedReports,
			UserPolicy.ManageProfile
		};

		/// <summary>
		/// Các quyền mặc định của vai trò Engineering (Kỹ sư Robotics)
		/// Kế thừa toàn bộ quyền của User + các quyền phân tích, chẩn đoán, nạp log, thẩm định
		/// </summary>
		public static readonly IReadOnlyList<string> EngineeringPolicies = UserPolicies.Concat(new[]
		{
			UserPolicy.ViewEngineeringDashboard,
			UserPolicy.ViewAllBags,
			UserPolicy.UploadBag,
			UserPolicy.ValidateBag,
			UserPolicy.DeleteBag,
			UserPolicy.ConfigureAnalysis,
			UserPolicy.ExecuteAnalysis,
			UserPolicy.ViewDiagnosticSessions,
			UserPolicy.UseChatAgent,
			UserPolicy.ViewReviews,
			UserPolicy.ApproveFindings,
			UserPolicy.ExportReports,
			UserPolicy.ViewBenchmark,
			UserPolicy.ViewUsageMetrics
		}).Distinct().ToList();

		/// <summary>
		/// Các quyền mặc định của vai trò Admin (Quản trị viên)
		/// Toàn quyền trong hệ thống bao gồm tất cả các tính năng của Engineering và quyền quản trị
		/// </summary>
		public static readonly IReadOnlyList<string> AdminPolicies = UserPolicy.All;

		/// <summary>
		/// Lấy danh sách các Policy được phép theo Role
		/// </summary>
		public static IReadOnlyList<string> GetPoliciesForRole(RoleEnum role)
		{
			return role switch
			{
				RoleEnum.Admin => AdminPolicies,
				RoleEnum.Engineering => EngineeringPolicies,
				RoleEnum.User => UserPolicies,
				_ => Array.Empty<string>()
			};
		}

		/// <summary>
		/// Lấy danh sách các Role được phép mặc định cho một Policy cụ thể
		/// </summary>
		public static IReadOnlyList<string> GetAllowedRolesForPolicy(string policyName)
		{
			var allowed = new List<string>();

			if (AdminPolicies.Contains(policyName))
				allowed.Add(RoleEnum.Admin.ToString());

			if (EngineeringPolicies.Contains(policyName))
				allowed.Add(RoleEnum.Engineering.ToString());

			if (UserPolicies.Contains(policyName))
				allowed.Add(RoleEnum.User.ToString());

			return allowed;
		}

		/// <summary>
		/// Khởi tạo danh sách các thực thể AccountPolicy mặc định cho một User dựa theo Role
		/// </summary>
		public static List<AccountPolicy> CreateDefaultAccountPolicies(string userId, RoleEnum role, string rule = "allow")
		{
			var policies = GetPoliciesForRole(role);
			return policies.Select(p => new AccountPolicy
			{
				UserId = userId,
				PolicyName = p,
				PolicyRule = rule
			}).ToList();
		}
	}
}
