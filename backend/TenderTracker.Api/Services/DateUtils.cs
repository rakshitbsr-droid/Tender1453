using System.Globalization;

namespace TenderTracker.Api.Services;

/// <summary>
/// Server-side port of the date helpers in src/utils/tenderUtils.ts so that SLA
/// figures computed here match what the UI computes for display.
/// </summary>
public static class DateUtils
{
    /// <summary>
    /// Parses 'DD-MM-YYYY', 'DD-MM-YYYY HH:mm', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm' or ISO strings.
    /// Date-only values are taken as 09:00, same as the frontend.
    /// </summary>
    public static DateTime? ParseCustomDate(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;
        var s = dateStr.Trim();

        if (s.Contains('T') && TryParseGeneral(s, out var iso)) return iso;

        var parts = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var datePart = parts[0];
        var timePart = parts.Length > 1 ? parts[1] : "09:00";

        var dc = datePart.Split('-');
        if (dc.Length == 3
            && int.TryParse(dc[0], out var a)
            && int.TryParse(dc[1], out var month)
            && int.TryParse(dc[2], out var c))
        {
            var isYearFirst = dc[0].Length == 4;
            var year = isYearFirst ? a : c;
            var day = isYearFirst ? c : a;

            var tc = timePart.Split(':');
            var hh = tc.Length > 0 && int.TryParse(tc[0], out var h) ? h : 0;
            var mm = tc.Length > 1 && int.TryParse(tc[1], out var m) ? m : 0;

            // Built additively so out-of-range parts roll over like JS `new Date(y, m, d, hh, mm)`.
            if (year is >= 1 and <= 9999)
            {
                try
                {
                    return new DateTime(year, 1, 1)
                        .AddMonths(month - 1)
                        .AddDays(day - 1)
                        .AddHours(hh)
                        .AddMinutes(mm);
                }
                catch (ArgumentOutOfRangeException)
                {
                    // fall through to the general parser
                }
            }
        }

        return TryParseGeneral(s, out var fallback) ? fallback : null;
    }

    /// <summary>Working days (Mon-Fri) between the two dates, rounded to 1 decimal; 0 if either is missing.</summary>
    public static double CalculateElapsedDays(string? startStr, string? endStr)
    {
        var diff = Diff(startStr, endStr);
        return diff is null ? 0 : RoundTo1(diff.Value.TotalDays);
    }

    public static double CalculateElapsedHours(string? startStr, string? endStr)
    {
        var diff = Diff(startStr, endStr);
        return diff is null ? 0 : RoundTo1(diff.Value.TotalHours);
    }

    /// <summary>Formats as 'DD-MM-YYYY HH:mm'.</summary>
    public static string FormatDateTime(DateTime d) =>
        d.ToString("dd-MM-yyyy HH:mm", CultureInfo.InvariantCulture);

    /// <summary>JS `Math.round(x * 10) / 10` (halves round up, unlike .NET's banker's rounding).</summary>
    public static double RoundTo1(double value)
    {
        var scaled = value * 10;
        var floor = Math.Floor(scaled);
        return (scaled - floor >= 0.5 ? floor + 1 : floor) / 10;
    }

    /// <summary>
    /// JS `+x.toFixed(2)`. Goes through "F2" because it rounds the exact binary value like toFixed does;
    /// Math.Round(x, 2) scales first, so e.g. 44.1 * 0.95 (41.89499...) would become 41.9 instead of 41.89.
    /// </summary>
    public static double RoundTo2(double value) =>
        double.Parse(value.ToString("F2", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture);

    /// <summary>
    /// Time between two moments that falls on working days (Monday to Friday). Saturdays and Sundays
    /// are skipped entirely, so Friday 09:00 -> Monday 09:00 is exactly one day. Mirrors workingMsBetween
    /// in src/utils/tenderUtils.ts.
    /// </summary>
    public static TimeSpan WorkingTimeBetween(DateTime start, DateTime end)
    {
        var total = TimeSpan.Zero;
        var cursor = start;
        while (cursor < end)
        {
            var nextMidnight = cursor.Date.AddDays(1);
            var sliceEnd = nextMidnight < end ? nextMidnight : end;
            if (cursor.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) total += sliceEnd - cursor;
            cursor = sliceEnd;
        }
        return total;
    }

    private static TimeSpan? Diff(string? startStr, string? endStr)
    {
        var start = ParseCustomDate(startStr);
        var end = ParseCustomDate(endStr);
        if (start is null || end is null) return null;
        var diff = WorkingTimeBetween(start.Value, end.Value);
        return diff <= TimeSpan.Zero ? null : diff;
    }

    private static bool TryParseGeneral(string s, out DateTime result) =>
        DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out result);
}
