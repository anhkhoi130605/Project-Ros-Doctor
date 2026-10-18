using System;
using System.Collections.Generic;

namespace Application.Features.Rosbags.DTOs
{
	public class InspectRosbagRequestDto
	{
		public string? BagId { get; set; }
		public string? BagPath { get; set; }
		public string? SampleName { get; set; }
	}

	public class SampleBagInfoDto
	{
		public string Name { get; set; } = string.Empty;
		public string Path { get; set; } = string.Empty;
		[System.Text.Json.Serialization.JsonIgnore]
		public string PhysicalPath { get; set; } = string.Empty;
		public long SizeBytes { get; set; }
		public string Format { get; set; } = "sqlite3";
		public bool HasYaml { get; set; }
		public string? CreatedDate { get; set; }
	}

	public class TopicMetadataDto
	{
		public int TopicId { get; set; }
		public string TopicName { get; set; } = string.Empty;
		public string TopicType { get; set; } = string.Empty;
		public string SerializationFormat { get; set; } = "cdr";
		public int MessageCount { get; set; }
		public long SizeBytes { get; set; }
		public double AvgFrequencyHz { get; set; }
		public double MinDeltaTimeMs { get; set; }
		public double MaxDeltaTimeMs { get; set; }
		public double AvgDeltaTimeMs { get; set; }
		public long FirstTimestampNs { get; set; }
		public long LastTimestampNs { get; set; }
	}

	public class TimelineBucketDto
	{
		public double TimeOffsetSec { get; set; }
		public int MessageCount { get; set; }
		public Dictionary<string, int> TopicCounts { get; set; } = new Dictionary<string, int>();
	}

	public class BagTimelineDto
	{
		public long StartTimestampNs { get; set; }
		public long EndTimestampNs { get; set; }
		public string StartTimeUtc { get; set; } = string.Empty;
		public string EndTimeUtc { get; set; } = string.Empty;
		public double DurationSec { get; set; }
		public List<TimelineBucketDto> Buckets { get; set; } = new List<TimelineBucketDto>();
	}

	public class RosbagAnomalyDto
	{
		public string Id { get; set; } = string.Empty;
		public string? Topic { get; set; }
		public string AnomalyType { get; set; } = string.Empty;
		public string Severity { get; set; } = "MEDIUM";
		public string TimeRange { get; set; } = string.Empty;
		public string IssueTitle { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public string SuggestedFix { get; set; } = string.Empty;
	}

	public class RosbagInspectionReportDto
	{
		public string BagName { get; set; } = string.Empty;
		public string BagPath { get; set; } = string.Empty;
		public long FileSizeBytes { get; set; }
		public string StorageFormat { get; set; } = "sqlite3";
		public int TotalMessages { get; set; }
		public int TopicCount { get; set; }
		public double DurationSec { get; set; }
		public int HealthScore { get; set; } = 100;
		public double ProcessingTimeSec { get; set; }
		public string? SessionId { get; set; }
		public string? BagId { get; set; }
		public BagTimelineDto Timeline { get; set; } = new BagTimelineDto();
		public List<TopicMetadataDto> Topics { get; set; } = new List<TopicMetadataDto>();
		public List<RosbagAnomalyDto> Anomalies { get; set; } = new List<RosbagAnomalyDto>();
		public List<Domain.Entities.NoSql.TfFrameNode> TfFrames { get; set; } = new();
	}
}
