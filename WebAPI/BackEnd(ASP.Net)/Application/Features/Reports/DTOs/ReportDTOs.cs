using System;
using System.Collections.Generic;

namespace Application.Features.Reports.DTOs
{
	public class ReportDto
	{
		public string Id { get; set; } = string.Empty;
		public string SessionId { get; set; } = string.Empty;
		public string Title { get; set; } = string.Empty;
		public string Status { get; set; } = "draft";
		public string GeneratedAt { get; set; } = string.Empty;
		public string? Reviewer { get; set; }
		public int ApprovedCount { get; set; } = 0;
		public int TotalFindings { get; set; } = 0;
		public object? Snapshot { get; set; }
	}

	public class CreateReportRequestDto
	{
		public string SessionId { get; set; } = string.Empty;
		public string Title { get; set; } = string.Empty;
		public string? SummaryMarkdown { get; set; }
	}
}
