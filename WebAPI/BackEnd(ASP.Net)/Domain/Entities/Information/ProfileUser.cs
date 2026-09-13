using System.Collections.Generic;
using Domain.Entities.AboutUser;
using Domain.Entities.Config;
using Domain.Entities.FeedBack;
// Nhớ using các namespace chứa các Entity liên quan (User, Department, EventWaitlist...)

namespace Domain.Entities.Information
{
	public class ProfileUser : BaseEntity
	{
		// Khóa ngoại (nếu có liên kết với bảng User, bạn nên có cột UserId ở đây)
		// public string UserId { get; set; } = null!;

		public string? DepartmentId { get; set; }

		public string? CurrentSemester { get; set; }

		public string? Address { get; set; }

		public string? StudentCode { get; set; }

		public string? EmergencyContactName { get; set; }

		public string? EmergencyContactPhone { get; set; }

		// ==========================================
		// QUAN HỆ 1-1 HOẶC N-1 (NAVIGATION PROPERTIES)
		// ==========================================

		public virtual User? User { get; set; }

		// ==========================================
		// QUAN HỆ 1-N (COLLECTIONS) - Đã tối ưu bằng HashSet
		// ==========================================

		public virtual ICollection<Feedback> Feedbacks { get; set; } = new HashSet<Feedback>();

		public virtual ICollection<StudentQuizScore> StudentQuizScores { get; set; } = new HashSet<StudentQuizScore>();

		public virtual ICollection<TeamMember> TeamMembers { get; set; } = new HashSet<TeamMember>();

		public virtual ICollection<Ticket> Tickets { get; set; } = new HashSet<Ticket>();
	}
}