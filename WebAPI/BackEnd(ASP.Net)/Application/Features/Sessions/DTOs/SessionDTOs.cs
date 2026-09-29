using System;
using System.Collections.Generic;

namespace Application.Features.Sessions.DTOs
{
	public class SessionDetailDto
	{
		public string Id { get; set; } = string.Empty;
		public string BagId { get; set; } = string.Empty;
		public string Name { get; set; } = string.Empty;
		public int Duration { get; set; }
		public int Topics { get; set; }
		public int Messages { get; set; }
		public string Status { get; set; } = "processing";
		public int HealthScore { get; set; } = 100;
		public int ProcessingSeconds { get; set; } = 0;
		public string CreatedAt { get; set; } = string.Empty;
		public List<DiagnosticIssueDto> Issues { get; set; } = new();
		public object? TfTree { get; set; }
	}

	public class DiagnosticIssueDto
	{
		public string Id { get; set; } = string.Empty;
		public string SessionId { get; set; } = string.Empty;
		public string Title { get; set; } = string.Empty;
		public string? Topic { get; set; }
		public string Severity { get; set; } = "medium";
		public string? Interval { get; set; }
		public string? Observation { get; set; }
		public string? Hypothesis { get; set; }
		public List<string> Steps { get; set; } = new();
		public ReviewInfoDto? Review { get; set; }
	}

	public class ReviewInfoDto
	{
		public string Status { get; set; } = "pending";
		public string? Note { get; set; }
		public string? By { get; set; }
		public string? At { get; set; }
	}

	public class StartAnalysisRequestDto
	{
		public string BagId { get; set; } = string.Empty;
		public string? RobotProfile { get; set; }
		public int WindowSeconds { get; set; } = 10;
		public int DeadTopicSeconds { get; set; } = 3;
		public int ClockThresholdMs { get; set; } = 30;
		public int TfToleranceMs { get; set; } = 50;
	}
}
