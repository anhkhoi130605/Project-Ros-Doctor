using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Reports.DTOs;
using Application.Interfaces.ManageTransaction;
using Application.Interfaces.Repositories;
using Domain.Entities.NoSql;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;
using MediatR;

namespace Application.Features.Reports.Queries
{
	public record GetReportsQuery() : IRequest<List<ReportDto>>;

	public class GetReportsQueryHandler : IRequestHandler<GetReportsQuery, List<ReportDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetReportsQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<ReportDto>> Handle(GetReportsQuery request, CancellationToken cancellationToken)
		{
			var reports = (await _unitOfWork.Reports.GetAllAsync(null, null, cancellationToken))
				.OrderByDescending(r => r.CreatedAt)
				.ToList();

			if (reports.Count == 0) return new List<ReportDto>();

			var sessionIds = reports.Select(r => r.SessionId).Distinct().ToHashSet();
			var issues = await _unitOfWork.DiagnosticIssues.GetAllAsync(i => sessionIds.Contains(i.SessionId), null, cancellationToken);
			var issueCounts = issues.GroupBy(i => i.SessionId).ToDictionary(g => g.Key, g => g.Count());

			return reports.Select(r => new ReportDto
			{
				Id = r.Id,
				SessionId = r.SessionId,
				Title = r.Title,
				Status = r.Status.ToString().ToLower(),
				GeneratedAt = r.CreatedAt.ToString("o"),
				Reviewer = r.ReviewerId,
				ApprovedCount = r.ApprovedConclusionCount,
				TotalFindings = issueCounts.TryGetValue(r.SessionId, out var count) ? count : 0
			}).ToList();
		}
	}

	public record GetReportByIdQuery(string Id) : IRequest<ReportDto?>;

	public class GetReportByIdQueryHandler : IRequestHandler<GetReportByIdQuery, ReportDto?>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IReportSnapshotRepository _reportSnapshotRepo;

		public GetReportByIdQueryHandler(IUnitOfWork unitOfWork, IReportSnapshotRepository reportSnapshotRepo)
		{
			_unitOfWork = unitOfWork;
			_reportSnapshotRepo = reportSnapshotRepo;
		}

		public async Task<ReportDto?> Handle(GetReportByIdQuery request, CancellationToken cancellationToken)
		{
			var report = await _unitOfWork.Reports.GetByIdAsync(request.Id, cancellationToken);
			if (report == null) return null;

			var issues = await _unitOfWork.DiagnosticIssues.GetAllAsync(null, null, cancellationToken);
			var totalFindings = issues.Count(i => i.SessionId == report.SessionId);

			var snapshot = await _reportSnapshotRepo.GetByReportIdAsync(report.Id, cancellationToken);

			return new ReportDto
			{
				Id = report.Id,
				SessionId = report.SessionId,
				Title = report.Title,
				Status = report.Status.ToString().ToLower(),
				GeneratedAt = report.CreatedAt.ToString("o"),
				Reviewer = report.ReviewerId,
				ApprovedCount = report.ApprovedConclusionCount,
				TotalFindings = totalFindings,
				Snapshot = snapshot
			};
		}
	}
}

namespace Application.Features.Reports.Commands
{
	public record CreateReportCommand(CreateReportRequestDto Request, string ReviewerId) : IRequest<ReportDto>;

	public class CreateReportCommandHandler : IRequestHandler<CreateReportCommand, ReportDto>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IReportSnapshotRepository _reportSnapshotRepo;

		public CreateReportCommandHandler(IUnitOfWork unitOfWork, IReportSnapshotRepository reportSnapshotRepo)
		{
			_unitOfWork = unitOfWork;
			_reportSnapshotRepo = reportSnapshotRepo;
		}

		public async Task<ReportDto> Handle(CreateReportCommand command, CancellationToken cancellationToken)
		{
			var reportId = "RPT-" + Guid.NewGuid().ToString("N")[..6].ToUpper();

			var report = new Report
			{
				Id = reportId,
				SessionId = command.Request.SessionId,
				Title = command.Request.Title,
				Status = ReportStatus.Approved,
				ReviewerId = command.ReviewerId,
				ApprovedConclusionCount = 3,
				CreatedAt = DateTime.UtcNow,
				PublishedAt = DateTime.UtcNow
			};

			await _unitOfWork.Reports.CreateAsync(report, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			var snapshot = new ReportSnapshotDocument
			{
				ReportId = reportId,
				SessionId = command.Request.SessionId,
				Title = report.Title,
				ReviewerId = command.ReviewerId,
				SnapshotAt = DateTime.UtcNow
			};
			await _reportSnapshotRepo.CreateSnapshotAsync(snapshot, cancellationToken);

			return new ReportDto
			{
				Id = report.Id,
				SessionId = report.SessionId,
				Title = report.Title,
				Status = report.Status.ToString().ToLower(),
				GeneratedAt = report.CreatedAt.ToString("o"),
				Reviewer = report.ReviewerId,
				ApprovedCount = report.ApprovedConclusionCount,
				TotalFindings = 3
			};
		}
	}
}
