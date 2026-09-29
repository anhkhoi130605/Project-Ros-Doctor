using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	public class TopicMetricsTimeseriesDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("session_id")]
		public string SessionId { get; set; } = null!;

		[BsonElement("topic_name")]
		public string TopicName { get; set; } = null!; // e.g. /scan, /imu, /odom

		[BsonElement("expected_hz")]
		public double ExpectedHz { get; set; }

		[BsonElement("cell_count")]
		public int CellCount { get; set; } = 42;

		[BsonElement("time_cells")]
		public List<TopicTimeCellPoint> TimeCells { get; set; } = new();

		[BsonElement("created_at")]
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}

	public class TopicTimeCellPoint
	{
		[BsonElement("second_index")]
		public int SecondIndex { get; set; }

		[BsonElement("observed_hz")]
		public double ObservedHz { get; set; }

		[BsonElement("drop_rate_percent")]
		public double DropRatePercent { get; set; }

		[BsonElement("status")]
		public string Status { get; set; } = "OK"; // OK, WARNING, ERROR, SILENT
	}
}
