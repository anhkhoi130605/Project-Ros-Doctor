using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	public class ReportSnapshotDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("report_id")]
		public string ReportId { get; set; } = null!; // FK reference to MySQL reports.report_id

		[BsonElement("session_id")]
		public string SessionId { get; set; } = null!;

		[BsonElement("title")]
		public string Title { get; set; } = null!;

		[BsonElement("reviewer_id")]
		public string? ReviewerId { get; set; }

		[BsonElement("approved_conclusions")]
		public List<BsonDocument> ApprovedConclusions { get; set; } = new();

		[BsonElement("robot_specs")]
		public BsonDocument? RobotSpecs { get; set; }

		[BsonElement("static_charts")]
		public List<BsonDocument> StaticCharts { get; set; } = new();

		[BsonElement("snapshot_at")]
		public DateTime SnapshotAt { get; set; } = DateTime.UtcNow;
	}
}
