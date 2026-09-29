using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	public class FindingEvidenceDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("session_id")]
		public string SessionId { get; set; } = null!;

		[BsonElement("finding_id")]
		public string FindingId { get; set; } = null!;

		[BsonElement("kind")]
		public string Kind { get; set; } = null!; // frequency, clock, tf, silent

		[BsonElement("raw_rosout_logs")]
		public List<string> RawRosoutLogs { get; set; } = new();

		[BsonElement("waveform_points")]
		public List<double> WaveformPoints { get; set; } = new();

		[BsonElement("steps")]
		public List<string> Steps { get; set; } = new();

		[BsonElement("extra_metadata")]
		public BsonDocument? ExtraMetadata { get; set; }

		[BsonElement("created_at")]
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}
}
