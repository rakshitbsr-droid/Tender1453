using TenderTracker.Api.Models;

namespace TenderTracker.Api.Services;

/// <summary>
/// Stage hand-off rules. Ported from handleAdvanceStage in the original React App.tsx;
/// behaviour is intentionally identical.
/// </summary>
public static class TenderWorkflow
{
    public const string AwardedStage = "Awarded";

    public static readonly string[] Stages =
    [
        "PR Received",
        "Under Estimation",
        "BQC Preparation",
        "To be Floated",
        "Under Bidding",
        "Under BQC / Tech Evaluation",
        "Under Award TEC",
        "Under Negotiation",
        "Awarded",
        "Cancelled",
        "Under Discussion with User",
    ];

    public static readonly string[] Roles = ["PM", "FM", "CEC", "ADMIN"];

    /// <summary>
    /// Recomputes the stored day counts from the recorded dates so they count working days only
    /// (weekends excluded): each closed timeline entry, the per-pillar totals, the SLA and the
    /// approving-committee time. Figures without dates to derive them from are left as they are.
    /// Safe to run repeatedly.
    /// </summary>
    public static Tender RecalculateWorkingDays(Tender t)
    {
        var timeline = t.Timeline
            .Select(e =>
            {
                if (string.IsNullOrEmpty(e.ExitDate)) return e;
                var days = DateUtils.CalculateElapsedDays(e.EntryDate, e.ExitDate);
                if (days <= 0) return e; // same-moment entries (e.g. the Awarded marker) keep their token value
                return e with
                {
                    DaysSpent = days,
                    HoursSpent = e.HoursSpent is null ? null : DateUtils.CalculateElapsedHours(e.EntryDate, e.ExitDate),
                };
            })
            .ToList();

        double SumFor(string role) =>
            DateUtils.RoundTo1(timeline.Where(e => e.Role == role && !string.IsNullOrEmpty(e.ExitDate)).Sum(e => e.DaysSpent ?? 0));

        var slaDays = t.SlaDays;
        if (slaDays is not null && timeline.Count > 0)
        {
            var slaStart = string.IsNullOrEmpty(t.ReceiptActionablePr) ? t.DatePrInitialIndent : t.ReceiptActionablePr;
            var recomputed = DateUtils.CalculateElapsedDays(slaStart, timeline[^1].EntryDate);
            if (recomputed > 0) slaDays = recomputed;
        }

        var committeeDays = t.TimeTakenApprovingCommitteeDays;
        if (committeeDays is not null)
        {
            var recomputed = DateUtils.CalculateElapsedDays(t.TecProposedOn, t.TecApprovalDate);
            if (recomputed > 0) committeeDays = recomputed;
        }

        return t with
        {
            Timeline = timeline,
            DaysByRole = timeline.Count > 0
                ? new DaysByRole { PM = SumFor("PM"), FM = SumFor("FM"), CEC = SumFor("CEC") }
                : t.DaysByRole,
            SlaDays = slaDays,
            TimeTakenApprovingCommitteeDays = committeeDays,
        };
    }

    public static Tender Advance(Tender t, AdvanceStageRequest request, DateTime now)
    {
        var transitionTime = string.IsNullOrWhiteSpace(request.HandoffTimestamp)
            ? DateUtils.FormatDateTime(now)
            : request.HandoffTimestamp;

        var timeline = new List<TimelineLogEntry>(t.Timeline);
        double daysSpentInLastStage = 0;

        // Close out the open timeline entry using entry_date vs. the hand-off time
        if (timeline.Count > 0)
        {
            var last = timeline[^1];
            if (string.IsNullOrEmpty(last.ExitDate))
            {
                var computedDays = DateUtils.CalculateElapsedDays(last.EntryDate, transitionTime);
                var computedHours = DateUtils.CalculateElapsedHours(last.EntryDate, transitionTime);
                last = last with
                {
                    ExitDate = transitionTime,
                    DaysSpent = Math.Max(0.1, computedDays),
                    HoursSpent = Math.Max(0.1, computedHours),
                };
                daysSpentInLastStage = last.DaysSpent.Value;
                timeline[^1] = last;
            }
        }

        var isNowAwarded = request.NextStage == AwardedStage;

        timeline.Add(new TimelineLogEntry
        {
            Stage = request.NextStage,
            Role = request.NextRole,
            Holder = request.NextHolder,
            EntryDate = transitionTime,
            ExitDate = isNowAwarded ? transitionTime : null,
            DaysSpent = isNowAwarded ? 0.1 : null,
            HoursSpent = isNowAwarded ? 2.4 : null,
            Remarks = request.Remarks,
        });

        // Credit the elapsed days to whichever pillar was holding the file
        var days = t.DaysByRole;
        days = t.CurrentRole switch
        {
            "PM" => days with { PM = DateUtils.RoundTo1(days.PM + daysSpentInLastStage) },
            "FM" => days with { FM = DateUtils.RoundTo1(days.FM + daysSpentInLastStage) },
            "CEC" => days with { CEC = DateUtils.RoundTo1(days.CEC + daysSpentInLastStage) },
            _ => days,
        };

        // Total SLA runs from initial PR receipt to the hand-off time
        var slaStart = string.IsNullOrEmpty(t.ReceiptActionablePr) ? t.DatePrInitialIndent : t.ReceiptActionablePr;
        var totalCumulativeDays = DateUtils.CalculateElapsedDays(slaStart, transitionTime);
        var newSlaDays = totalCumulativeDays > 0
            ? totalCumulativeDays
            : (t.SlaDays ?? 0) + daysSpentInLastStage;

        double? awardedValue = t.AwardedValueCr;
        double? savings = t.SavingsDueToNegotiationCr;
        if (isNowAwarded)
        {
            awardedValue = request.AwardedValue is > 0 or < 0
                ? request.AwardedValue
                : t.EstimateValueCr * 0.95;
            savings = request.Savings ?? DateUtils.RoundTo2(t.EstimateValueCr - awardedValue.Value);
        }

        return t with
        {
            BriefStatus = request.NextStage,
            CurrentHolder = isNowAwarded ? "" : request.NextHolder,
            CurrentRole = request.NextRole,
            Timeline = timeline,
            DaysByRole = days,
            SlaDays = DateUtils.RoundTo1(newSlaDays),
            // Zero is stored as null, matching the original falsy checks
            AwardedValueCr = awardedValue is null or 0 ? null : DateUtils.RoundTo2(awardedValue.Value),
            SavingsDueToNegotiationCr = savings is null or 0 ? null : DateUtils.RoundTo2(savings.Value),
            TecApprovalDate = isNowAwarded ? transitionTime : t.TecApprovalDate,
            TenderRegisterUpdated = isNowAwarded ? "YES" : t.TenderRegisterUpdated,
            AocCompleted = isNowAwarded ? "YES" : t.AocCompleted,
            ContractOlaCreated = isNowAwarded ? "YES" : t.ContractOlaCreated,
        };
    }
}
