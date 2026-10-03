using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using TenderTracker.Api.Services;

namespace TenderTracker.Api.Controllers;

/// <summary>
/// Master data and the task list, each stored as one JSON value under a key (stages, slaRules, groups,
/// userFunctions, tenderTypes, leadershipSettings, tasks). The frontend owns their shape and falls
/// back to its built-in defaults for a key that has never been saved.
/// </summary>
[ApiController]
[Route("api/settings")]
public sealed class SettingsController(TenderStore store) : ControllerBase
{
    [HttpGet]
    public IReadOnlyDictionary<string, JsonElement> GetAll() => store.GetSettings();

    [HttpPut("{key}")]
    public IActionResult Set(string key, [FromBody] JsonElement value)
    {
        store.SetSetting(key, value);
        return NoContent();
    }
}
