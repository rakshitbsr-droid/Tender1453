using System.Text.Json.Serialization;

namespace TenderTracker.Api.Models;

// JSON names mirror the frontend contract in src/types.ts exactly.
public sealed record Tender
{
    [JsonPropertyName("sr_no")] public int SrNo { get; init; }
    [JsonPropertyName("pr_no")] public string PrNo { get; init; } = "";
    [JsonPropertyName("crfq_no")] public string CrfqNo { get; init; } = "";
    [JsonPropertyName("date_pr_initial_indent")] public string DatePrInitialIndent { get; init; } = "";
    [JsonPropertyName("receipt_actionable_pr")] public string ReceiptActionablePr { get; init; } = "";
    [JsonPropertyName("tender_sent_tech_eval")] public string TenderSentTechEval { get; init; } = "";
    [JsonPropertyName("receipt_tech_eval")] public string ReceiptTechEval { get; init; } = "";
    [JsonPropertyName("item_description")] public string ItemDescription { get; init; } = "";
    [JsonPropertyName("user_function")] public string UserFunction { get; init; } = "";
    [JsonPropertyName("date_receipt_estimate_cec")] public string DateReceiptEstimateCec { get; init; } = "";
    [JsonPropertyName("pm_officer")] public string PmOfficer { get; init; } = "";
    [JsonPropertyName("attached_pms")] public List<string> AttachedPms { get; init; } = [];
    [JsonPropertyName("tender_type")] public string TenderType { get; init; } = "";
    [JsonPropertyName("tender_floated_on")] public string TenderFloatedOn { get; init; } = "";
    [JsonPropertyName("tender_opened_due_on")] public string TenderOpenedDueOn { get; init; } = "";
    [JsonPropertyName("estimate_value_cr")] public double EstimateValueCr { get; init; }
    [JsonPropertyName("brief_status")] public string BriefStatus { get; init; } = "";
    [JsonPropertyName("awarded_value_cr")] public double? AwardedValueCr { get; init; }
    [JsonPropertyName("tec_proposed_on")] public string TecProposedOn { get; init; } = "";
    [JsonPropertyName("tec_approval_date")] public string TecApprovalDate { get; init; } = "";
    [JsonPropertyName("tender_register_updated")] public string TenderRegisterUpdated { get; init; } = "";
    [JsonPropertyName("aoc_completed")] public string AocCompleted { get; init; } = "";
    [JsonPropertyName("contract_ola_created")] public string ContractOlaCreated { get; init; } = "";
    [JsonPropertyName("sla_days")] public double? SlaDays { get; init; }
    [JsonPropertyName("savings_due_to_negotiation_cr")] public double? SavingsDueToNegotiationCr { get; init; }
    [JsonPropertyName("time_taken_approving_committee_days")] public double? TimeTakenApprovingCommitteeDays { get; init; }
    [JsonPropertyName("month_year")] public string MonthYear { get; init; } = "";
    [JsonPropertyName("remarks")] public string Remarks { get; init; } = "";
    [JsonPropertyName("attached_fms")] public List<string> AttachedFms { get; init; } = [];
    [JsonPropertyName("attached_cec_officers")] public List<string> AttachedCecOfficers { get; init; } = [];
    [JsonPropertyName("current_holder")] public string CurrentHolder { get; init; } = "";
    [JsonPropertyName("current_role")] public string CurrentRole { get; init; } = "";
    [JsonPropertyName("priority")] public string Priority { get; init; } = "Normal";

    [JsonPropertyName("group")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Group { get; init; }

    [JsonPropertyName("days_by_role")] public DaysByRole DaysByRole { get; init; } = new();
    [JsonPropertyName("timeline")] public List<TimelineLogEntry> Timeline { get; init; } = [];
}

public sealed record DaysByRole
{
    [JsonPropertyName("PM")] public double PM { get; init; }
    [JsonPropertyName("FM")] public double FM { get; init; }
    [JsonPropertyName("CEC")] public double CEC { get; init; }
}

public sealed record TimelineLogEntry
{
    [JsonPropertyName("stage")] public string Stage { get; init; } = "";
    [JsonPropertyName("role")] public string Role { get; init; } = "";
    [JsonPropertyName("holder")] public string Holder { get; init; } = "";
    [JsonPropertyName("entry_date")] public string EntryDate { get; init; } = "";
    [JsonPropertyName("exit_date")] public string? ExitDate { get; init; }
    [JsonPropertyName("days_spent")] public double? DaysSpent { get; init; }

    // Optional in the frontend type, so omitted (not null) when absent.
    [JsonPropertyName("hours_spent")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? HoursSpent { get; init; }

    [JsonPropertyName("remarks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Remarks { get; init; }

    [JsonPropertyName("action_type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ActionType { get; init; }
}
