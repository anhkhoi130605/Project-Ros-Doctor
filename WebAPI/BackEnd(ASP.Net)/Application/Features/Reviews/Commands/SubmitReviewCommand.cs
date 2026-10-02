using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Reviews.DTOs;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.RosbagAnalysis;
using Domain.Enums;

namespace Application.Features.Reviews.Commands
{
	public record SubmitReviewCommand(string FindingId, SubmitReviewRequestDto Request, string ReviewerId) : IRequest<ReviewItemDto>;

	public class SubmitReviewCommandHandler : IRequestHandler<SubmitReviewCommand, ReviewItemDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public SubmitReviewCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<ReviewItemDto> Handle(SubmitReviewCommand command, CancellationToken cancellationToken)
		{
			var issue = await _unitOfWork.DiagnosticIssues.GetByIdAsync(command.FindingId, cancellationToken);
			if (issue == null)
			{
				throw new ArgumentException($"Finding {command.FindingId} not found");
			}

			var decision = Enum.TryParse<ReviewStatus>(command.Request.Decision, true, out var d)
				? d
				: ReviewStatus.Approved;

			var auditLog = new ReviewAuditLog
			{
				Id = "aud-" + Guid.NewGuid().ToString("N")[..8],
				FindingId = issue.Id,
				Decision = decision,
				ReviewerId = command.ReviewerId,
				ReviewNote = command.Request.Note,
				ReviewedAt = DateTime.UtcNow
			};

			await _unitOfWork.ReviewAuditLogs.CreateAsync(auditLog, cancellationToken);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			return new ReviewItemDto
			{
				Id = issue.Id,
				SessionId = issue.SessionId,
				Title = issue.IssueTitle,
				Topic = issue.Topic,
				Severity = issue.Severity.ToString().ToLower(),
				Interval = issue.TimeRange,
				Status = auditLog.Decision.ToString().ToLower(),
				Note = auditLog.ReviewNote,
				ReviewedBy = auditLog.ReviewerId,
				ReviewedAt = auditLog.ReviewedAt.ToString("o")
			};
		}
	}
}
