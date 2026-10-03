using System.Text.Json;
using TenderTracker.Api.Models;

namespace TenderTracker.Api.Services;

/// <summary>
/// Holds tenders, officers and master settings in memory. Tenders and officers start from Data/Seed
/// and every change is written next to the Storage:DataFile JSON file (tenders.json, users.json,
/// settings.json), so data survives a restart. Delete those files to reset back to the seed data.
/// </summary>
public sealed class TenderStore
{
    private static readonly JsonSerializerOptions FileJsonOptions = new() { WriteIndented = true };

    private readonly Lock _gate = new();
    private readonly string _dataFile;
    private readonly string _usersFile;
    private readonly string _settingsFile;
    private readonly ILogger<TenderStore> _logger;
    private readonly List<Tender> _tenders;
    private readonly Dictionary<string, JsonElement> _settings;
    private List<UserProfile> _users;

    public TenderStore(IWebHostEnvironment env, IConfiguration config, ILogger<TenderStore> logger)
    {
        _logger = logger;
        var seedDir = Path.Combine(env.ContentRootPath, "Data", "Seed");
        _dataFile = Path.Combine(env.ContentRootPath, config["Storage:DataFile"] ?? "App_Data/tenders.json");
        var dataDir = Path.GetDirectoryName(_dataFile)!;
        _usersFile = Path.Combine(dataDir, "users.json");
        _settingsFile = Path.Combine(dataDir, "settings.json");

        _users = ReadJson<List<UserProfile>>(File.Exists(_usersFile) ? _usersFile : Path.Combine(seedDir, "users.json"));
        _settings = File.Exists(_settingsFile) ? ReadJson<Dictionary<string, JsonElement>>(_settingsFile) : [];

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
    }

    public IReadOnlyList<UserProfile> GetUsers()
    {
        lock (_gate) return _users.ToList();
    }

    public IReadOnlyList<UserProfile> ReplaceUsers(List<UserProfile> users)
    {
        lock (_gate)
        {
            _users = users.ToList();
            WriteJson(_usersFile, _users);
            return _users.ToList();
        }
    }

    public IReadOnlyDictionary<string, JsonElement> GetSettings()
    {
        lock (_gate) return new Dictionary<string, JsonElement>(_settings);
    }

    public void SetSetting(string key, JsonElement value)
    {
        lock (_gate)
        {
            _settings[key] = value.Clone();
            WriteJson(_settingsFile, _settings);
        }
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

    private void Save() => WriteJson(_dataFile, _tenders);

    private static void WriteJson<T>(string path, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(value, FileJsonOptions));
        File.Move(tmp, path, overwrite: true);
    }

    private static T ReadJson<T>(string path) =>
        JsonSerializer.Deserialize<T>(File.ReadAllText(path))
        ?? throw new InvalidOperationException($"'{path}' is empty or not valid JSON.");
}
