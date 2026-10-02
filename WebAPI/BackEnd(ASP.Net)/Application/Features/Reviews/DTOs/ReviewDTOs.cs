using System;
using System.Collections.Generic;

namespace Application.Features.Reviews.DTOs
{
	public class ReviewItemDto
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
		public string? Kind { get; set; }
		public List<string> RawRosoutLogs { get; set; } = new();
		public List<double> WaveformPoints { get; set; } = new();
		public string Status { get; set; } = "pending";
		public string? Note { get; set; }
		public string? ReviewedBy { get; set; }
		public string? ReviewedAt { get; set; }
	}

	public class SubmitReviewRequestDto
	{
		public string Decision { get; set; } = "approved"; // approved, rejected, changes
		public string? Note { get; set; }
	}
}
