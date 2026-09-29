using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	public class AgentExecutionTraceDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("session_id")]
		public string SessionId { get; set; } = null!;

		[BsonElement("step")]
		public string Step { get; set; } = null!; // e.g. "01", "02"

		[BsonElement("title")]
		public string Title { get; set; } = null!; // e.g. "Tổng hợp bất thường"

		[BsonElement("retrieved_context")]
		public List<string> RetrievedContext { get; set; } = new();

		[BsonElement("raw_prompt")]
		public string? RawPrompt { get; set; }

		[BsonElement("hypothesis")]
		public string? Hypothesis { get; set; }

		[BsonElement("confidence")]
		public double Confidence { get; set; }

		[BsonElement("timestamp")]
		public DateTime Timestamp { get; set; } = DateTime.UtcNow;
	}
}
