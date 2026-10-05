using System;
using System.IO;
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
	public record UploadAndInspectBagCommand(Stream Stream, string FileName, Stream? YamlStream = null, string? YamlFileName = null) : IRequest<RosbagInspectionReportDto>;

	public class UploadAndInspectBagCommandHandler : IRequestHandler<UploadAndInspectBagCommand, RosbagInspectionReportDto>
	{
		private readonly IRosbagInspectorService _inspectorService;
		private readonly IUnitOfWork _unitOfWork;
		private readonly ISessionEvidenceRepository _evidenceRepo;

		public UploadAndInspectBagCommandHandler(IRosbagInspectorService inspectorService, IUnitOfWork unitOfWork, ISessionEvidenceRepository evidenceRepo)
		{
			_inspectorService = inspectorService;
			_unitOfWork = unitOfWork;
			_evidenceRepo = evidenceRepo;
		}

		public async Task<RosbagInspectionReportDto> Handle(UploadAndInspectBagCommand request, CancellationToken cancellationToken)
		{
			var report = await _inspectorService.InspectUploadedFileAsync(request.Stream, request.FileName, request.YamlStream, request.YamlFileName, cancellationToken);

			try
			{
				var users = await _unitOfWork.User.GetAllAsync(null, null, cancellationToken);
				var userId = users.FirstOrDefault()?.Id ?? "usr-system";

				var bagId = "bag-" + Guid.NewGuid().ToString("N")[..8];
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
				await _unitOfWork.Rosbags.CreateAsync(rosbag, cancellationToken);

				var sessionId = "sess-" + Guid.NewGuid().ToString("N")[..8];
				var session = new AnalysisSession
				{
					Id = sessionId,
					RosbagId = rosbag.Id,
					EngineerId = userId,
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

					// Persist Session TF Tree to MongoDB
					if (report.TfFrames != null && report.TfFrames.Count > 0)
					{
						await _evidenceRepo.InsertTfTreeAsync(new SessionTfTreeDocument
						{
							SessionId = session.Id,
							Frames = report.TfFrames,
							CreatedAt = DateTime.UtcNow
						}, cancellationToken);
					}
				}
				catch (Exception tsEx)
				{
					Console.WriteLine($"[MongoDB] Error inserting timeseries or TF tree: {tsEx.Message}");
				}

				await _unitOfWork.SaveChangesAsync(cancellationToken);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[Warning] Failed to persist uploaded bag to DB: {ex.Message}");
			}

			return report;
		}
	}
}
