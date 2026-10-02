using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domain.Entities.NoSql
{
	[BsonIgnoreExtraElements]
	public class BenchmarkDatasetDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("code")]
		public string Code { get; set; } = null!; // e.g. "C01"

		[BsonElement("name")]
		public string Name { get; set; } = null!;

		[BsonElement("test_cases")]
		public List<BenchmarkTestCaseItem> TestCases { get; set; } = new();

		[BsonElement("created_at")]
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}

	[BsonIgnoreExtraElements]
	public class BenchmarkTestCaseItem
	{
		[BsonElement("code")]
		public string Code { get; set; } = null!;

		[BsonElement("rosbag_name")]
		public string RosbagName { get; set; } = null!;

		[BsonElement("topic")]
		public string Topic { get; set; } = null!;

		[BsonElement("start_sec")]
		public double StartSec { get; set; }

		[BsonElement("end_sec")]
		public double EndSec { get; set; }

		[BsonElement("label")]
		public string Label { get; set; } = null!;

		[BsonElement("ground_truth")]
		public string? GroundTruth { get; set; }
	}

	[BsonIgnoreExtraElements]
	public class BenchmarkEvaluationDocument
	{
		[BsonId]
		[BsonRepresentation(BsonType.ObjectId)]
		public string? Id { get; set; }

		[BsonElement("dataset_id")]
		public string DatasetId { get; set; } = null!;

		[BsonElement("faithfulness_score")]
		public double FaithfulnessScore { get; set; }

		[BsonElement("hallucination_score")]
		public double HallucinationScore { get; set; }

		[BsonElement("answer_relevancy_score")]
		public double AnswerRelevancyScore { get; set; }

		[BsonElement("confusion_matrix")]
		public Dictionary<string, int> ConfusionMatrix { get; set; } = new();

		[BsonElement("evaluated_at")]
		public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
	}
}
