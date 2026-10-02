using System;
using System.Collections.Generic;
using Domain.Enums;

namespace Domain.Entities.RosbagAnalysis
{
	public class TopicMetadata
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

	public class TimelineBucket
	{
		public double TimeOffsetSec { get; set; }
		public int MessageCount { get; set; }
		public Dictionary<string, int> TopicCounts { get; set; } = new Dictionary<string, int>();
	}

	public class BagTimeline
	{
		public long StartTimestampNs { get; set; }
		public long EndTimestampNs { get; set; }
		public DateTime StartTimeUtc { get; set; }
		public DateTime EndTimeUtc { get; set; }
		public double DurationSec { get; set; }
		public List<TimelineBucket> Buckets { get; set; } = new List<TimelineBucket>();
	}

	public class RosbagAnomaly
	{
		public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
		public string? Topic { get; set; }
		public string AnomalyType { get; set; } = string.Empty; // DROPPED_FRAME, TOPIC_TIMEOUT, TIMESTAMP_INVERSION, EMPTY_PAYLOAD, IRREGULAR_FREQUENCY
		public IssueSeverity Severity { get; set; } = IssueSeverity.MEDIUM;
		public string TimeRange { get; set; } = string.Empty;
		public string IssueTitle { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public string SuggestedFix { get; set; } = string.Empty;
	}

	public class RosbagInspectionReport
	{
		public string BagName { get; set; } = string.Empty;
		public string BagPath { get; set; } = string.Empty;
		public long FileSizeBytes { get; set; }
		public string StorageFormat { get; set; } = "sqlite3";
		public int TotalMessages { get; set; }
		public int TopicCount { get; set; }
		public double DurationSec { get; set; }
		public int HealthScore { get; set; } = 100;
		public BagTimeline Timeline { get; set; } = new BagTimeline();
		public List<TopicMetadata> Topics { get; set; } = new List<TopicMetadata>();
		public List<RosbagAnomaly> Anomalies { get; set; } = new List<RosbagAnomaly>();
	}
}
