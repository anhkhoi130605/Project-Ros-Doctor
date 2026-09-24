using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.ManageTrancsaction;
using Domain.Entities.AboutUser;
using Domain.Helper;
using static Domain.Enums.UserEnum;

namespace Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser
{
	public class GetMembersQueryHandler : IRequestHandler<GetMembersQuery, List<MemberDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetMembersQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<MemberDto>> Handle(GetMembersQuery request, CancellationToken cancellationToken)
		{
			// 1. Lấy danh sách toàn bộ người dùng
			var users = await _unitOfWork.User.GetAllAsync();

			// 2. Lấy danh sách Role để map RoleName tương ứng
			var roles = await _unitOfWork.Roles.GetAllAsync();
			var roleMap = roles.ToDictionary(r => r.Id, r => r.RoleName?.ToString() ?? "User");

			// 3. Lấy nhật ký hoạt động trong 2 giờ gần nhất để ước lượng trạng thái Online/Offline
			var threshold = DateTimeHelper.GetVietnamTime().AddHours(-2);
			var recentLogs = await _unitOfWork.UserActivityLogs.GetAllAsync(
				filter: l => l.CreatedAt >= threshold
			);
			var latestLogByUser = recentLogs
				.Where(l => !string.IsNullOrEmpty(l.UserId))
				.GroupBy(l => l.UserId!)
				.ToDictionary(
					g => g.Key,
					g => g.OrderByDescending(x => x.CreatedAt).FirstOrDefault()
				);

			var now = DateTimeHelper.GetVietnamTime();
			var result = new List<MemberDto>();

			foreach (var user in users.OrderByDescending(u => u.CreatedAt))
			{
				string roleName = "User";
				if (!string.IsNullOrEmpty(user.RoleId) && roleMap.TryGetValue(user.RoleId, out var rName))
				{
					roleName = rName;
				}
				else if (user.Role?.RoleName != null)
				{
					roleName = user.Role.RoleName.ToString() ?? "User";
				}

				latestLogByUser.TryGetValue(user.Id, out var lastLog);

				var lastActiveTime = lastLog?.CreatedAt ?? user.UpdatedAt;
				string statusText = "Offline";

				if (user.IsBanned == true || user.Status == UserStatusEnum.Banned)
				{
					statusText = "Banned";
				}
				else if (lastActiveTime != default && (now - lastActiveTime).TotalMinutes <= 20)
				{
					statusText = "Online";
				}
				else if (lastActiveTime != default && (now - lastActiveTime).TotalHours <= 2)
				{
					statusText = "Away";
				}
				else
				{
					statusText = "Offline";
				}

				result.Add(new MemberDto
				{
					Id = user.Id,
					FullName = string.IsNullOrWhiteSpace(user.FullName) ? user.Email : user.FullName,
					Email = user.Email,
					Role = roleName,
					Status = statusText,
					AvatarUrl = user.AvatarUrl,
					Phone = user.Phone,
					LastActiveAt = lastActiveTime == default ? null : lastActiveTime,
					LastAction = lastLog?.Action,
					CreatedAt = user.CreatedAt
				});
			}

			return result;
		}
	}
}
