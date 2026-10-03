using System;
using System.Collections.Generic;
using System.Data.Common;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	public class RosbagAnalysisContext
	{
		public DbConnection Connection { get; set; } = null!;
		public string BagPath { get; set; } = string.Empty;
		public string BagDirectory { get; set; } = string.Empty;
		public string BagName { get; set; } = string.Empty;
		public string Db3Path { get; set; } = string.Empty;
		public string? YamlPath { get; set; }
		public long FileSizeBytes { get; set; }
		public int TotalMessages { get; set; }

		public long OverallMinTs { get; set; } = long.MaxValue;
		public long OverallMaxTs { get; set; } = long.MinValue;
		public double TotalDurationSec { get; set; }

		public Dictionary<int, TopicMetadataDto> Topics { get; set; } = new Dictionary<int, TopicMetadataDto>();
		public Dictionary<int, List<long>> TopicTimestamps { get; set; } = new Dictionary<int, List<long>>();
		public Dictionary<int, long> TopicSizes { get; set; } = new Dictionary<int, long>();

		public string FormatTimestampNs(long ns)
		{
			if (ns <= 0) return "0s";
			var dt = DateTimeOffset.FromUnixTimeMilliseconds(ns / 1_000_000);
			return dt.ToString("HH:mm:ss.fff");
		}

		public string FormatTimestampRange(long startNs, long endNs)
		{
			return $"{FormatTimestampNs(startNs)} -> {FormatTimestampNs(endNs)}";
		}

		public string FormatRelativeRange(long startNs, long endNs)
		{
			if (OverallMinTs <= 0 || OverallMinTs == long.MaxValue)
			{
				return $"{FormatTimestampNs(startNs)} -> {FormatTimestampNs(endNs)}";
			}
			double relStartSec = Math.Max(0, (startNs - OverallMinTs) / 1e9);
			double relEndSec = Math.Max(0, (endNs - OverallMinTs) / 1e9);
			var tStart = TimeSpan.FromSeconds(relStartSec);
			var tEnd = TimeSpan.FromSeconds(relEndSec);
			return $"{tStart:mm\\:ss\\.fff} -> {tEnd:mm\\:ss\\.fff} (+{Math.Round(relStartSec, 1)}s)";
		}

		public double GetRelativeSec(long ns)
		{
			if (OverallMinTs <= 0 || OverallMinTs == long.MaxValue) return 0;
			return Math.Max(0, (ns - OverallMinTs) / 1e9);
		}
	}
}
