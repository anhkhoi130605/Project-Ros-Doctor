using System;
using System.Collections.Generic;

namespace Application.Features.Dashboard.DTOs
{
	public class DashboardStatsDto
	{
		public int TotalBags { get; set; }
		public int CompleteBags { get; set; }
		public int ProcessingBags { get; set; }
		public int PendingBags { get; set; }
		public int TotalSessions { get; set; }
		public int TotalIssues { get; set; }
		public int HighSeverityIssues { get; set; }
		public int TotalReports { get; set; }
		public long TotalTokensUsed { get; set; }
		public decimal TotalCostUsd { get; set; }
		public int HealthScoreAvg { get; set; } = 92;
	}
}
