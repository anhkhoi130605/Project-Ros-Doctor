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

		// Legacy datasets without these fields remain published at version 1.
		[BsonElement("is_published")]
		public bool IsPublished { get; set; } = true;

		[BsonElement("version")]
		public int Version { get; set; } = 1;

		[BsonElement("updated_at")]
		public DateTime? UpdatedAt { get; set; }

		[BsonElement("change_request")]
		public BenchmarkChangeRequest? ChangeRequest { get; set; }

		[BsonElement("provenance")]
		public string? Provenance { get; set; }
	}

	public class BenchmarkContent
	{
		[BsonElement("name")]
		public string Name { get; set; } = "";
		[BsonElement("provenance")]
		public string? Provenance { get; set; }
		[BsonElement("test_cases")]
		public List<BenchmarkTestCaseItem> TestCases { get; set; } = new();
	}

	public class BenchmarkChangeRequest
	{
		[BsonElement("request_id")]
		public string RequestId { get; set; } = "";
		[BsonElement("request_type")]
		public string RequestType { get; set; } = "";
		[BsonElement("proposed_data")]
		public BenchmarkContent ProposedData { get; set; } = new();
		[BsonElement("status")]
		public string Status { get; set; } = "Pending";
		[BsonElement("requested_by")]
		public string RequestedBy { get; set; } = "";
		[BsonElement("requested_at")]
		public DateTime RequestedAt { get; set; }
		[BsonElement("reviewed_by")]
		public string? ReviewedBy { get; set; }
		[BsonElement("reviewed_at")]
		public DateTime? ReviewedAt { get; set; }
		[BsonElement("review_note")]
		public string? ReviewNote { get; set; }
		[BsonElement("base_version")]
		public int BaseVersion { get; set; }
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

		[BsonElement("case_id")]
		[BsonIgnoreIfNull]
		public string? CaseId { get; set; }

		// JSON object (not a JSON-encoded string). Legacy ground_truth remains unchanged.
		[BsonElement("ground_truth_detail")]
		[BsonIgnoreIfNull]
		[BsonSerializer(typeof(GroundTruthJsonSerializer))]
		public global::System.Text.Json.JsonElement? GroundTruthDetail { get; set; }
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
