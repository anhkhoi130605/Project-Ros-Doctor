using System;

namespace Application.Features.Rosbags.DTOs
{
	public enum RosbagJobStatus
	{
		Pending,
		Processing,
		Completed,
		Failed
	}

	public class RosbagAnalysisJob
	{
		public string JobId { get; set; } = Guid.NewGuid().ToString("N")[..12];
		public string FileName { get; set; } = string.Empty;
		public string? TempFilePath { get; set; }
		public string? YamlTempFilePath { get; set; }
		public RosbagJobStatus Status { get; set; } = RosbagJobStatus.Pending;
		public int ProgressPercent { get; set; } = 0;
		public string Stage { get; set; } = "Chờ trong hàng đợi xử lý";
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? CompletedAt { get; set; }
		public string? ErrorMessage { get; set; }
		public RosbagInspectionReportDto? Result { get; set; }
	}
}
