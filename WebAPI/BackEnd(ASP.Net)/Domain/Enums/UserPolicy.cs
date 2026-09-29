using System;
using System.Collections.Generic;

namespace Domain.Enums
{
	/// <summary>
	/// Danh sách các Policy (quyền hạn) dạng chuỗi (string constants) trong hệ thống,
	/// được xác định dựa theo các tính năng và vai trò ở Frontend.
	/// </summary>
	public static class UserPolicy
	{
		// ==========================================
		// 1. NHÓM QUYỀN USER / VIEWER (Chỉ xem cơ bản)
		// ==========================================
		/// <summary>Xem Dashboard tổng quan chung</summary>
		public const string ViewDashboard = "ViewDashboard";

		/// <summary>Xem danh sách và chi tiết các Rosbag được chia sẻ (Read-only)</summary>
		public const string ViewSharedBags = "ViewSharedBags";

		/// <summary>Xem các báo cáo chẩn đoán đã được kỹ sư duyệt và công bố</summary>
		public const string ViewApprovedReports = "ViewApprovedReports";

		/// <summary>Xem và cập nhật thông tin cá nhân (Profile)</summary>
		public const string ManageProfile = "ManageProfile";

		// ==========================================
		// 2. NHÓM QUYỀN ENGINEERING (Kỹ sư Robotics)
		// (Kế thừa toàn bộ quyền User + các tính năng chuyên sâu)
		// ==========================================
		/// <summary>Xem Dashboard kỹ thuật chuyên sâu (widget tần số, độ trễ, node crash, v.v.)</summary>
		public const string ViewEngineeringDashboard = "ViewEngineeringDashboard";

		/// <summary>Xem toàn bộ danh sách tệp Rosbag trong hệ thống</summary>
		public const string ViewAllBags = "ViewAllBags";

		/// <summary>Tải lên (Upload) các tệp Rosbag mới (.mcap, .db3)</summary>
		public const string UploadBag = "UploadBag";

		/// <summary>Kiểm tra (Validate) tính hợp lệ của tệp Rosbag</summary>
		public const string ValidateBag = "ValidateBag";

		/// <summary>Xóa tệp Rosbag khỏi hệ thống</summary>
		public const string DeleteBag = "DeleteBag";

		/// <summary>Cấu hình thông số phân tích chẩn đoán (ngưỡng tần số, QoS, TF, Sync clock)</summary>
		public const string ConfigureAnalysis = "ConfigureAnalysis";

		/// <summary>Khởi chạy tiến trình phân tích chẩn đoán log robot</summary>
		public const string ExecuteAnalysis = "ExecuteAnalysis";

		/// <summary>Xem chi tiết phiên phân tích (Topics, Issues, Cây TF, Đồng bộ Clock, Agent Insights)</summary>
		public const string ViewDiagnosticSessions = "ViewDiagnosticSessions";

		/// <summary>Tương tác hỏi đáp với Chat Agent AI hỗ trợ phân tích robotics</summary>
		public const string UseChatAgent = "UseChatAgent";

		/// <summary>Xem danh sách kết luận cần thẩm định (Reviews)</summary>
		public const string ViewReviews = "ViewReviews";

		/// <summary>Thẩm định & Duyệt kết luận chẩn đoán (Approve / Reject / Changes needed)</summary>
		public const string ApproveFindings = "ApproveFindings";

		/// <summary>Xuất và tạo báo cáo chẩn đoán kỹ thuật (PDF, Excel, JSON)</summary>
		public const string ExportReports = "ExportReports";

		/// <summary>Chạy và đánh giá mô hình kiểm thử Benchmark</summary>
		public const string ViewBenchmark = "ViewBenchmark";

		/// <summary>Theo dõi chi phí token và hiệu suất mô hình AI (Usage / Cost & Performance)</summary>
		public const string ViewUsageMetrics = "ViewUsageMetrics";

		// ==========================================
		// 3. NHÓM QUYỀN ADMIN (Quản trị hệ thống)
		// (Toàn quyền hệ thống + các tính năng quản trị)
		// ==========================================
		/// <summary>Quản lý tài khoản người dùng (Xem danh sách thành viên, cập nhật thông tin)</summary>
		public const string ManageUsers = "ManageUsers";

		/// <summary>Phân quyền & thay đổi vai trò người dùng (Admin, Engineering, User)</summary>
		public const string AssignRoles = "AssignRoles";

		/// <summary>Khóa (Ban) và mở khóa tài khoản người dùng</summary>
		public const string BanUser = "BanUser";

		/// <summary>Xem nhật ký lỗi hệ thống (System Logs) và kích hoạt lỗi kiểm thử</summary>
		public const string ViewSystemLogs = "ViewSystemLogs";

		/// <summary>Xem nhật ký hoạt động người dùng (User Activity Logs)</summary>
		public const string ViewUserActivity = "ViewUserActivity";

		/// <summary>Cấu hình mô hình AI (API keys, model selector, prompt template)</summary>
		public const string ConfigureAi = "ConfigureAi";

		/// <summary>Cấu hình tham số chẩn đoán và quy tắc phân tích hệ thống</summary>
		public const string ConfigureAnalysisRules = "ConfigureAnalysisRules";

		/// <summary>Cài đặt cấu hình hệ thống toàn cục</summary>
		public const string ManageSystemSettings = "ManageSystemSettings";

		/// <summary>
		/// Danh sách tất cả các Policy dạng chuỗi
		/// </summary>
		public static readonly IReadOnlyList<string> All = new[]
		{
			ViewDashboard, ViewSharedBags, ViewApprovedReports, ManageProfile,
			ViewEngineeringDashboard, ViewAllBags, UploadBag, ValidateBag, DeleteBag,
			ConfigureAnalysis, ExecuteAnalysis, ViewDiagnosticSessions, UseChatAgent,
			ViewReviews, ApproveFindings, ExportReports, ViewBenchmark, ViewUsageMetrics,
			ManageUsers, AssignRoles, BanUser, ViewSystemLogs, ViewUserActivity,
			ConfigureAi, ConfigureAnalysisRules, ManageSystemSettings
		};
	}
}
