using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Domain.Entities.NoSql;

// Preserve heterogeneous measurements (phases, sub_faults, windows) across HTTP/BSON.
public sealed class GroundTruthJsonSerializer : SerializerBase<JsonElement?>
{
    public override JsonElement? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        if (context.Reader.GetCurrentBsonType() == BsonType.Null)
        {
            context.Reader.ReadNull();
            return null;
        }
        var document = BsonDocumentSerializer.Instance.Deserialize(context);
        using var json = JsonDocument.Parse(document.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.RelaxedExtendedJson }));
        return json.RootElement.Clone();
    }

    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, JsonElement? value)
    {
        if (value == null || value.Value.ValueKind == JsonValueKind.Null)
        {
            context.Writer.WriteNull();
            return;
        }
        if (value.Value.ValueKind != JsonValueKind.Object)
            throw new BsonSerializationException("ground_truth_detail must be an object.");
        BsonDocumentSerializer.Instance.Serialize(context, BsonDocument.Parse(value.Value.GetRawText()));
    }
}
