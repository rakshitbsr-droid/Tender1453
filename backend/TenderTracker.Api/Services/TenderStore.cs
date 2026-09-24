using System.Text.Json;
using TenderTracker.Api.Models;

namespace TenderTracker.Api.Services;

/// <summary>
/// Holds users and tenders in memory. Tenders start from Data/Seed/tenders.json and every
/// change is written to the Storage:DataFile JSON file, so data survives a restart.
/// Delete that file to reset back to the seed data.
/// </summary>
public sealed class TenderStore
{
    private static readonly JsonSerializerOptions FileJsonOptions = new() { WriteIndented = true };

    private readonly Lock _gate = new();
    private readonly string _dataFile;
    private readonly ILogger<TenderStore> _logger;
    private readonly List<Tender> _tenders;

    public IReadOnlyList<UserProfile> Users { get; }

    public TenderStore(IWebHostEnvironment env, IConfiguration config, ILogger<TenderStore> logger)
    {
        _logger = logger;
        var seedDir = Path.Combine(env.ContentRootPath, "Data", "Seed");
        _dataFile = Path.Combine(env.ContentRootPath, config["Storage:DataFile"] ?? "App_Data/tenders.json");

        Users = ReadJson<List<UserProfile>>(Path.Combine(seedDir, "users.json"));

        if (File.Exists(_dataFile))
        {
            _tenders = ReadJson<List<Tender>>(_dataFile);
            _logger.LogInformation("Loaded {Count} tenders from {File}", _tenders.Count, _dataFile);
        }
        else
        {
            _tenders = ReadJson<List<Tender>>(Path.Combine(seedDir, "tenders.json"));
            _logger.LogInformation("Seeded {Count} tenders", _tenders.Count);
        }

        // Day counts exclude weekends; older data was stored in calendar days.
        for (var i = 0; i < _tenders.Count; i++) _tenders[i] = TenderWorkflow.RecalculateWorkingDays(_tenders[i]);
    }

    public IReadOnlyList<Tender> GetAll()
    {
        lock (_gate) return _tenders.ToList();
    }

    public Tender? Get(int srNo)
    {
        lock (_gate) return _tenders.FirstOrDefault(t => t.SrNo == srNo);
    }

    /// <summary>Adds a tender at the top of the register, reassigning sr_no if it is missing or taken.</summary>
    public Tender Add(Tender tender)
    {
        lock (_gate)
        {
            var nextSrNo = _tenders.Count > 0 ? _tenders.Max(t => t.SrNo) + 1 : 1;
            var srNoIsFree = tender.SrNo > 0 && _tenders.All(t => t.SrNo != tender.SrNo);
            var saved = tender with { SrNo = srNoIsFree ? tender.SrNo : nextSrNo };

            _tenders.Insert(0, saved);
            Save();
            return saved;
        }
    }

    /// <summary>Applies <paramref name="change"/> to the tender atomically. Returns null if not found.</summary>
    public Tender? Update(int srNo, Func<Tender, Tender> change)
    {
        lock (_gate)
        {
            var index = _tenders.FindIndex(t => t.SrNo == srNo);
            if (index < 0) return null;

            var updated = change(_tenders[index]);
            _tenders[index] = updated;
            Save();
            return updated;
        }
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_dataFile)!);
        var tmp = _dataFile + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_tenders, FileJsonOptions));
        File.Move(tmp, _dataFile, overwrite: true);
    }

    private static T ReadJson<T>(string path) =>
        JsonSerializer.Deserialize<T>(File.ReadAllText(path))
        ?? throw new InvalidOperationException($"'{path}' is empty or not valid JSON.");
}
