using System.Text.Json;
using Domain.Entities.NoSql;

namespace Application.Interfaces;

public static class BenchmarkGroundTruthValidation
{
    private const int MaxGroundTruthLength = 120_000;
    private const int MaxNestingDepth = 16;
    private const int SchemaVersion = 1;
    private const int MaxFaultTypeLength = 200;
    private const string NoneFaultType = "none";

    private static readonly System.Text.RegularExpressions.Regex CaseIdRegex =
        new(@"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly string[] RequiredLocales = ["vi", "en"];
    private static readonly string[] RequiredFields = ["required_evidence", "remediation_playbook"];

    public static void Validate(BenchmarkTestCaseItem item)
    {
        if (item.CaseId != null && !CaseIdRegex.IsMatch(item.CaseId))
            throw new ArgumentException("case_id không hợp lệ / Invalid case_id.");
        if (item.GroundTruthDetail is not { } value || value.ValueKind == JsonValueKind.Null) return;
        if (value.ValueKind != JsonValueKind.Object || value.GetRawText().Length > MaxGroundTruthLength)
            throw new ArgumentException($"ground_truth_detail phải là object, tối đa {MaxGroundTruthLength} ký tự / must be an object, max {MaxGroundTruthLength} characters.");
        CheckTree(value, 0);
        if (!value.TryGetProperty("schema_version", out var version) || version.ValueKind != JsonValueKind.Number || !version.TryGetInt32(out var number) || number != SchemaVersion ||
            !value.TryGetProperty("has_fault", out var fault) || fault.ValueKind is not (JsonValueKind.True or JsonValueKind.False) ||
            !value.TryGetProperty("fault_type", out var type) || type.ValueKind != JsonValueKind.String)
            throw new ArgumentException("Ground truth cần schema_version=1, has_fault và fault_type nhất quán / Invalid ground truth header.");

        var faultType = type.GetString();
        var hasFault = fault.GetBoolean();
        if (string.IsNullOrWhiteSpace(faultType) || faultType.Length > MaxFaultTypeLength ||
            (!hasFault && faultType != NoneFaultType) || (hasFault && faultType == NoneFaultType))
            throw new ArgumentException("Ground truth cần schema_version=1, has_fault và fault_type nhất quán / Invalid ground truth header.");

        if (!value.TryGetProperty("i18n", out var locales) || locales.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Ground truth cần i18n.vi và i18n.en / Both languages are required.");
        foreach (var language in RequiredLocales)
        {
            if (!locales.TryGetProperty(language, out var content) || content.ValueKind != JsonValueKind.Object)
                throw new ArgumentException("Ground truth cần i18n.vi và i18n.en / Both languages are required.");
            foreach (var field in RequiredFields)
                if (!content.TryGetProperty(field, out var entries) || entries.ValueKind != JsonValueKind.Array ||
                    entries.GetArrayLength() == 0 || entries.EnumerateArray().Any(x => x.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(x.GetString())))
                    throw new ArgumentException($"i18n.{language}.{field} phải là danh sách chuỗi không rỗng / must be a nonempty string array.");
        }
    }

    private static void CheckTree(JsonElement value, int depth)
    {
        if (depth > MaxNestingDepth) throw new ArgumentException("Ground truth quá nhiều tầng / exceeds maximum nesting depth.");
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in value.EnumerateObject())
            {
                if (!names.Add(property.Name) || property.Name.StartsWith('$') || property.Name.Contains('.') ||
                    property.Name.Contains('\0') || property.Name is "__proto__" or "constructor" or "prototype")
                    throw new ArgumentException("Ground truth có tên trường trùng hoặc không hợp lệ / Invalid or duplicate field name.");
                CheckTree(property.Value, depth + 1);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var child in value.EnumerateArray()) CheckTree(child, depth + 1);
        else if (value.ValueKind == JsonValueKind.Number && (!value.TryGetDouble(out var number) || !double.IsFinite(number)))
            throw new ArgumentException("Ground truth chứa số không hữu hạn / Non-finite number.");
    }
}
