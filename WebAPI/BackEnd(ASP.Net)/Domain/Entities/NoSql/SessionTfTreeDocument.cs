using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	public class SessionTfTreeDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("session_id")]
		public string SessionId { get; set; } = null!;

		[BsonElement("frames")]
		public List<TfFrameNode> Frames { get; set; } = new();

		[BsonElement("broken_edges")]
		public List<TfBrokenEdge> BrokenEdges { get; set; } = new();

		[BsonElement("created_at")]
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}

	public class TfFrameNode
	{
		[BsonElement("name")]
		public string Name { get; set; } = null!;

		[BsonElement("parent")]
		public string? Parent { get; set; }

		[BsonElement("translation")]
		public double[] Translation { get; set; } = Array.Empty<double>();

		[BsonElement("rotation")]
		public double[] Rotation { get; set; } = Array.Empty<double>();
	}

	public class TfBrokenEdge
	{
		[BsonElement("source")]
		public string Source { get; set; } = null!;

		[BsonElement("target")]
		public string Target { get; set; } = null!;

		[BsonElement("reason")]
		public string? Reason { get; set; }
	}
}
