using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Common;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Repositories;
using Application.Interfaces.Rosbag;
using Domain.Entities.NoSql;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;
using MediatR;

namespace Application.Features.Rosbags.Commands
{
	public record InspectRosbagCommand(string? BagPath, string? SampleName, string? EngineerId = null) : IRequest<RosbagInspectionReportDto>;

	public class InspectRosbagCommandHandler : IRequestHandler<InspectRosbagCommand, RosbagInspectionReportDto>
	{
		private readonly IRosbagInspectorService _inspectorService;
		private readonly IUnitOfWork _unitOfWork;
		private readonly ISessionEvidenceRepository _evidenceRepo;

		public InspectRosbagCommandHandler(IRosbagInspectorService inspectorService, IUnitOfWork unitOfWork, ISessionEvidenceRepository evidenceRepo)
		{
			_inspectorService = inspectorService;
			_unitOfWork = unitOfWork;
			_evidenceRepo = evidenceRepo;
		}

		public async Task<RosbagInspectionReportDto> Handle(InspectRosbagCommand request, CancellationToken cancellationToken)
		{
			RosbagInspectionReportDto report;
			Rosbag? existingBag = null;
			if (!string.IsNullOrWhiteSpace(request.BagPath))
			{
				// Use the existing RosbagId when inspecting a submitted file. Check before reading or analyzing it.
				var fullPath = System.IO.Path.GetFullPath(request.BagPath);
				var storedBags = await _unitOfWork.Rosbags.GetAllAsync(b => b.StorageUrl != null, null, cancellationToken);
				var matchingBags = storedBags.Where(b => PathsMatch(b.StorageUrl!, fullPath)).ToList();
				foreach (var match in matchingBags)
				{
					if (match.DeletedAt != null) throw new InvalidOperationException("Rosbag đã bị xóa.");
					match.EnsureApprovedForAnalysis();
				}
				existingBag = matchingBags.FirstOrDefault();
				report = await _inspectorService.InspectBagAsync(request.BagPath, cancellationToken);
			}
			else
			{
				report = await _inspectorService.InspectSampleAsync(request.SampleName, cancellationToken);
			}

			// Persist to MySQL database (Rosbag, AnalysisSession, DiagnosticIssues) and MongoDB (Evidence, Timeseries)
			try
			{
				var users = await _unitOfWork.User.GetAllAsync(null, null, cancellationToken);
				var userId = existingBag?.UserId ?? users.FirstOrDefault()?.Id ?? "usr-system";

				var bagId = existingBag?.Id ?? "bag-" + Guid.NewGuid().ToString("N")[..8];
				var rosbag = new Rosbag
				{
					Id = bagId,
					UserId = userId,
					FileName = report.BagName,
					StorageUrl = report.BagPath,
					SizeBytes = report.FileSizeBytes,
					Format = RosbagFormat.SQLite3,
					DurationSec = (int)Math.Round(report.DurationSec),
					TopicCount = report.TopicCount,
					Status = RosbagStatus.Complete,
					CreatedAt = DateTime.UtcNow
				};
				if (existingBag == null)
					await _unitOfWork.Rosbags.CreateAsync(rosbag, cancellationToken);
				else
				{
					existingBag.Status = RosbagStatus.Complete;
					existingBag.DurationSec = rosbag.DurationSec;
					existingBag.TopicCount = rosbag.TopicCount;
					await _unitOfWork.Rosbags.UpdateAsync(existingBag, cancellationToken);
				}

				var sessionId = "sess-" + Guid.NewGuid().ToString("N")[..8];
				var session = new AnalysisSession
				{
					Id = sessionId,
					RosbagId = rosbag.Id,
					EngineerId = existingBag != null ? request.EngineerId ?? userId : userId,
					Status = SessionStatus.Complete,
					HealthScore = report.HealthScore,
					ExecutionTimeSec = (int)Math.Max(1, Math.Round(report.ProcessingTimeSec)),
					StartedAt = DateTime.UtcNow.AddSeconds(-report.DurationSec),
					CompletedAt = DateTime.UtcNow
				};
				await _unitOfWork.AnalysisSessions.CreateAsync(session, cancellationToken);
				report.SessionId = session.Id;
				report.BagId = rosbag.Id;

				if (report.Anomalies != null && report.Anomalies.Count > 0)
				{
					var mongoEvidences = new List<FindingEvidenceDocument>();
					foreach (var a in report.Anomalies)
					{
						var severity = Enum.TryParse<IssueSeverity>(a.Severity, true, out var s) ? s : IssueSeverity.MEDIUM;
						var issueId = string.IsNullOrWhiteSpace(a.Id) ? "ISS-" + Guid.NewGuid().ToString("N")[..8] : a.Id;
						var issue = new DiagnosticIssue
						{
							Id = issueId,
							SessionId = session.Id,
							Topic = a.Topic,
							Severity = severity,
							TimeRange = a.TimeRange,
							IssueTitle = a.IssueTitle,
							CreatedAt = DateTime.UtcNow
						};
						await _unitOfWork.DiagnosticIssues.CreateAsync(issue, cancellationToken);

						mongoEvidences.Add(new FindingEvidenceDocument
						{
							SessionId = session.Id,
							FindingId = issue.Id,
							Kind = "frequency",
							RawRosoutLogs = new List<string>
							{
								$"[{DateTime.UtcNow:o}] [WARN] [{a.Topic}]: Bất thường ghi nhận tại khoảng {a.TimeRange}.",
								$"Tiêu đề sự cố: {a.IssueTitle}."
							},
							WaveformPoints = new List<double> { 10.0, 5.0, 1.0, 2.0, 8.0, 10.0 },
							Steps = new List<string>
							{
								$"Kiểm tra log của node phát topic {a.Topic}",
								"Đối chiếu với ngưỡng thiết lập trong hệ thống"
							},
							CreatedAt = DateTime.UtcNow
						});
					}

					try
					{
						if (mongoEvidences.Count > 0)
						{
							await _evidenceRepo.InsertEvidencesAsync(mongoEvidences, cancellationToken);
						}
					}
					catch (Exception mEx)
					{
						Console.WriteLine($"[MongoDB] Error inserting evidences: {mEx.Message}");
					}
				}

				// Also persist TopicMetricsTimeseries to MongoDB
				try
				{
					if (report.Topics != null && report.Topics.Count > 0)
					{
						var tsDocs = report.Topics.Select(t => new TopicMetricsTimeseriesDocument
						{
							SessionId = session.Id,
							TopicName = t.TopicName,
							ExpectedHz = t.AvgFrequencyHz,
							CellCount = 1,
							TimeCells = new List<TopicTimeCellPoint>
							{
								new()
								{
									SecondIndex = 0,
									ObservedHz = t.AvgFrequencyHz,
									DropRatePercent = 0,
									Status = "OK"
								}
							},
							CreatedAt = DateTime.UtcNow
						}).ToList();

						await _evidenceRepo.InsertTopicMetricsTimeseriesAsync(tsDocs, cancellationToken);
					}
				}
				catch (Exception tsEx)
				{
					Console.WriteLine($"[MongoDB] Error inserting timeseries: {tsEx.Message}");
				}

				await _unitOfWork.SaveChangesAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				if (existingBag != null) throw;
				Console.WriteLine($"[Warning] Failed to persist inspection to DB: {ex.Message}");
			}

			return report;
		}

		private static bool PathsMatch(string storedPath, string fullPath)
		{
			try
			{
				return string.Equals(System.IO.Path.GetFullPath(storedPath), fullPath,
					OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
			}
			catch (ArgumentException) { return false; }
			catch (NotSupportedException) { return false; }
		}
	}
}
