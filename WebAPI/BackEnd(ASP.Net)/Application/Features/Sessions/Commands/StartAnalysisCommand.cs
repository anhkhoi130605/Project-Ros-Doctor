using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Sessions.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;

namespace Application.Features.Sessions.Commands
{
	public record StartAnalysisCommand(StartAnalysisRequestDto Request, string UserId) : IRequest<SessionDetailDto>;

	public class StartAnalysisCommandHandler : IRequestHandler<StartAnalysisCommand, SessionDetailDto>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly ISessionEvidenceRepository _evidenceRepo;
		private readonly IRedisService _redisService;

		public StartAnalysisCommandHandler(IUnitOfWork unitOfWork, ISessionEvidenceRepository evidenceRepo, IRedisService redisService)
		{
			_unitOfWork = unitOfWork;
			_evidenceRepo = evidenceRepo;
			_redisService = redisService;
		}

		public async Task<SessionDetailDto> Handle(StartAnalysisCommand command, CancellationToken cancellationToken)
		{
			var sessionId = "ses-" + Guid.NewGuid().ToString("N")[..8];
			var bag = await _unitOfWork.Rosbags.GetByIdAsync(command.Request.BagId, cancellationToken);

			string? validEngineerId = null;
			if (!string.IsNullOrWhiteSpace(command.UserId) && command.UserId != "usr-guest")
			{
				var existingUser = await _unitOfWork.User.GetByIdAsync(command.UserId, cancellationToken);
				if (existingUser != null)
				{
					validEngineerId = existingUser.Id;
				}
			}

			if (validEngineerId == null)
			{
				var defaultEng = (await _unitOfWork.User.GetAllAsync(u => u.RoleId != null, null, cancellationToken)).FirstOrDefault();
				validEngineerId = defaultEng?.Id;
			}

			var session = new AnalysisSession
			{
				Id = sessionId,
				RosbagId = command.Request.BagId,
				EngineerId = validEngineerId,
				Status = SessionStatus.Complete,
				HealthScore = 86,
				ExecutionTimeSec = 24,
				StartedAt = DateTime.UtcNow,
				CompletedAt = DateTime.UtcNow.AddSeconds(24)
			};

			await _unitOfWork.AnalysisSessions.CreateAsync(session, cancellationToken);

			if (bag != null)
			{
				bag.Status = RosbagStatus.Complete;
				await _unitOfWork.Rosbags.UpdateAsync(bag, cancellationToken);
			}

			// Seed diagnostic issues for this session
			var issue1 = new DiagnosticIssue
			{
				Id = "iss-" + Guid.NewGuid().ToString("N")[..8],
				SessionId = sessionId,
				Topic = "/scan",
				Severity = IssueSeverity.HIGH,
				TimeRange = "00:35 – 00:40",
				IssueTitle = "Tần số /scan giảm bất thường"
			};

			var issue2 = new DiagnosticIssue
			{
				Id = "iss-" + Guid.NewGuid().ToString("N")[..8],
				SessionId = sessionId,
				Topic = "/camera/image ↔ /imu",
				Severity = IssueSeverity.MEDIUM,
				TimeRange = "01:18 – 01:22",
				IssueTitle = "Camera – IMU lệch thời gian stamp"
			};

			var issue3 = new DiagnosticIssue
			{
				Id = "iss-" + Guid.NewGuid().ToString("N")[..8],
				SessionId = sessionId,
				Topic = "map → odom",
				Severity = IssueSeverity.HIGH,
				TimeRange = "02:14 – 02:18",
				IssueTitle = "Thiếu kết nối TF tại thời điểm"
			};

			await _unitOfWork.DiagnosticIssues.CreateAsync(issue1, cancellationToken);
			await _unitOfWork.DiagnosticIssues.CreateAsync(issue2, cancellationToken);
			await _unitOfWork.DiagnosticIssues.CreateAsync(issue3, cancellationToken);

			await _unitOfWork.SaveChangesAsync(cancellationToken);

			// Save evidence to MongoDB
			try
			{
				var evidenceList = new List<FindingEvidenceDocument>
				{
					new FindingEvidenceDocument
					{
						FindingId = issue1.Id,
						SessionId = sessionId,
						Kind = "frequency",
						RawRosoutLogs = new List<string> { "WARN: /scan rate dropped to 2.1 Hz" },
						WaveformPoints = new List<double> { 10.0, 9.8, 4.2, 2.1, 2.0, 8.5, 10.1 },
						Steps = new List<string> { "Đối chiếu log /rosout", "Kiểm tra QoS và giới hạn tài nguyên" }
					},
					new FindingEvidenceDocument
					{
						FindingId = issue2.Id,
						SessionId = sessionId,
						Kind = "clock",
						RawRosoutLogs = new List<string> { "WARN: clock skew detected between /camera and /imu: 82ms" },
						WaveformPoints = new List<double> { 12, 18, 45, 82, 60, 25, 15 },
						Steps = new List<string> { "Xác minh nguồn đồng hồ hai cảm biến", "Kiểm tra thiết lập PTP/Chrony" }
					}
				};
				await _evidenceRepo.InsertEvidencesAsync(evidenceList, cancellationToken);
			}
			catch
			{
				// Ignore if mongo is temporarily unavailable
			}

			// Update Redis session progress
			try
			{
				await _redisService.SetAnalysisProgressAsync(sessionId, 100, "Hoàn tất phân tích dữ liệu");
			}
			catch
			{
				// Ignore if redis is unavailable
			}

			return new SessionDetailDto
			{
				Id = session.Id,
				BagId = session.RosbagId,
				Name = bag?.FileName ?? "ROS2 Bag",
				Duration = bag?.DurationSec ?? 272,
				Topics = bag?.TopicCount ?? 12,
				Messages = 387284,
				Status = "complete",
				HealthScore = 86,
				ProcessingSeconds = 24,
				CreatedAt = session.StartedAt.ToString("o"),
				Issues = new List<DiagnosticIssueDto>
				{
					new DiagnosticIssueDto
					{
						Id = issue1.Id,
						SessionId = sessionId,
						Title = issue1.IssueTitle,
						Topic = issue1.Topic,
						Severity = "high",
						Interval = issue1.TimeRange,
						Observation = "/scan ghi nhận khoảng 2 Hz trong khoảng 00:35–00:40. Mức kỳ vọng là 10 Hz.",
						Hypothesis = "Nguồn phát có thể bị nghẽn CPU hoặc dropped packets khi ghi dữ liệu.",
						Steps = new List<string> { "Đối chiếu log /rosout", "Kiểm tra QoS" },
						Review = new ReviewInfoDto { Status = "pending" }
					},
					new DiagnosticIssueDto
					{
						Id = issue2.Id,
						SessionId = sessionId,
						Title = issue2.IssueTitle,
						Topic = issue2.Topic,
						Severity = "medium",
						Interval = issue2.TimeRange,
						Observation = "Độ lệch timestamp camera – IMU tối đa 82 ms, vượt ngưỡng cấu hình 30 ms.",
						Hypothesis = "Hai cảm biến dùng clock domain hoặc hardware latency khác nhau.",
						Steps = new List<string> { "Xác minh nguồn đồng hồ hai cảm biến" },
						Review = new ReviewInfoDto { Status = "pending" }
					}
				}
			};
		}
	}
}
