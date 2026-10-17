using System;
using Domain.Enums;

namespace Application.Features.Rosbags.DTOs
{
	public class RosbagDto
	{
		public string Id { get; set; } = string.Empty;
		public string Name { get; set; } = string.Empty;
		public long Size { get; set; }
		public string Format { get; set; } = "MCAP";
		public int Duration { get; set; }
		public int Topics { get; set; }
		public string Status { get; set; } = "ready";
		public string? Date { get; set; }
		public string? SessionId { get; set; }
		public int ProcessingSeconds { get; set; }
		public string? UserId { get; set; }
	}

	public class CreateRosbagRequestDto
	{
		public string Name { get; set; } = string.Empty;
		public long Size { get; set; }
		public string Format { get; set; } = "MCAP";
		public int Duration { get; set; } = 0;
		public int Topics { get; set; } = 0;
	}

	public class BagDetailDto : RosbagDto
	{
		public string? Description { get; set; }
		public int TotalMessages { get; set; }
		public int HealthScore { get; set; } = 100;
	}

	public class RosbagDownloadResult
	{
		public System.IO.Stream Stream { get; set; } = System.IO.Stream.Null;
		public string FileName { get; set; } = string.Empty;
		public string ContentType { get; set; } = "application/octet-stream";
	}
}
