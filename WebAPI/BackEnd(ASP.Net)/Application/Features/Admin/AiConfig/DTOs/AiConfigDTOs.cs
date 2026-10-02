using System;
using System.Collections.Generic;

namespace Application.Features.Admin.AiConfig.DTOs
{
	public class AiConfigDto
	{
		public int DailyRequests { get; set; } = 100;
		public int TokensPerRun { get; set; } = 4000;
		public int RequestsPerMinute { get; set; } = 10;
		public decimal MonthlyBudget { get; set; } = 25.00m;
		public string VectorUrl { get; set; } = "http://localhost:6333";
		public string Model { get; set; } = "qwen-2.5-coder-32b";
		public string Prompt { get; set; } = "Phân tích log ROS2 dựa trên bằng chứng. Phân biệt quan sát với giả thuyết. Kỹ sư duyệt mọi kết luận.";
	}

	public class AiUsageSummaryDto
	{
		public int TotalCalls { get; set; }
		public int TotalPromptTokens { get; set; }
		public int TotalCompletionTokens { get; set; }
		public int TotalTokens { get; set; }
		public decimal TotalCostUsd { get; set; }
		public double AverageLatencyMs { get; set; }
		public List<AiUsageItemDto> RecentLogs { get; set; } = new();
	}

	public class AiUsageItemDto
	{
		public string Id { get; set; } = string.Empty;
		public string SessionId { get; set; } = string.Empty;
		public string ModelName { get; set; } = string.Empty;
		public int PromptTokens { get; set; }
		public int CompletionTokens { get; set; }
		public decimal CostUsd { get; set; }
		public int LatencyMs { get; set; }
		public string Timestamp { get; set; } = string.Empty;
	}

	public class WorkspaceMemberDto
	{
		public string Id { get; set; } = string.Empty;
		public string Name { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string Role { get; set; } = "Engineer";
		public string Workspace { get; set; } = "Robotics Lab";
		public bool Active { get; set; } = true;
	}
}
