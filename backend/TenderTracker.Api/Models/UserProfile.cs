using System.Text.Json.Serialization;

namespace TenderTracker.Api.Models;

public sealed record UserProfile
{
    [JsonPropertyName("id")] public string Id { get; init; } = "";
    [JsonPropertyName("name")] public string Name { get; init; } = "";
    [JsonPropertyName("role")] public string Role { get; init; } = "";
    [JsonPropertyName("designation")] public string Designation { get; init; } = "";
    [JsonPropertyName("pillar")] public string Pillar { get; init; } = "";

    [JsonPropertyName("group")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Group { get; init; }

    [JsonPropertyName("email")] public string Email { get; init; } = "";
    [JsonPropertyName("avatarColor")] public string AvatarColor { get; init; } = "";
}
