using System.Text.Json.Serialization;

namespace TenderTracker.Api.Models;

public sealed record AdvanceStageRequest
{
    [JsonPropertyName("next_stage")] public string NextStage { get; init; } = "";
    [JsonPropertyName("next_holder")] public string NextHolder { get; init; } = "";
    [JsonPropertyName("next_role")] public string NextRole { get; init; } = "";
    [JsonPropertyName("remarks")] public string Remarks { get; init; } = "";
    [JsonPropertyName("awarded_value")] public double? AwardedValue { get; init; }
    [JsonPropertyName("savings")] public double? Savings { get; init; }

    /// <summary>'DD-MM-YYYY HH:mm'. Defaults to the server's current time when omitted.</summary>
    [JsonPropertyName("handoff_timestamp")] public string? HandoffTimestamp { get; init; }
}
