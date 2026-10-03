import { Tender, TimelineLogEntry, UserProfile, UserRole } from '../types';
import {
  EVALUATION_STAGE,
  STAGE_STEPS,
  computeEvaluationSplit,
  formatCurrencyCr,
  getEffectiveTimeline,
  getEvaluationHolders,
  getOfficerGroup,
  getTimelineEntryDuration,
  holdsEvaluationBidders,
  isTenderRelatedToUser,
  normalizeToNineStages,
  parseCustomDate,
  workingMsBetween,
} from '../utils/tenderUtils';
import { Answer, AnswerBlock, AssistantData, DateField, Filters, GroupBy, Measure, Query, TableColumn, TableRow } from './types';
import { parseQuestion } from './parse';

// Answers a Query from the tenders the user may see. Every figure is computed here from the
// register, with the same working-day rule as the rest of the app; nothing is sent anywhere.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ROLE_LABEL: Record<string, string> = { PM: 'Procurement', FM: 'Finance', CEC: 'Estimation', ADMIN: 'Management' };
const STATUS_LABEL = { pipeline: 'In pipeline', awarded: 'Awarded', cancelled: 'Cancelled', closed: 'Closed', postAward: 'Post-award pending' };
const DATE_LABEL: Record<DateField, string> = { received: 'Received', floated: 'Floated', due: 'Due', awarded: 'Awarded', cancelled: 'Cancelled' };
const MEASURE_LABEL: Record<Measure | 'date', string> = {
  count: 'Tenders', value: 'Estimate', awarded: 'Awarded Value', savings: 'Savings', sla: 'Total Days', ageing: 'Days in Stage', date: 'PR Received',
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const pad = (n: number) => String(n).padStart(2, '0');
const lower = (s?: string | null) => (s || '').toLowerCase();
const money = (cr: number | null | undefined) => (cr === null || cr === undefined ? '—' : formatCurrencyCr(Math.round(cr * 100) / 100));
const dayText = (d: number | null | undefined) => (d === null || d === undefined ? '—' : `${d >= 10 ? Math.round(d) : round1(d)} d`);
const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const isPipeline = (t: Tender) => t.brief_status !== 'Awarded' && t.brief_status !== 'Cancelled';

function sumOf<T>(items: T[], pick: (item: T) => number | null | undefined): number {
  return items.reduce((total, item) => total + (pick(item) || 0), 0);
}

function averageOf(values: number[]): number | null {
  return values.length > 0 ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

function dateText(d: Date | null): string {
  return d ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}` : '—';
}

// 'Cancelled' and 'Under Discussion with User' are not workflow stages and must not be folded into one
function stageOfEntry(entry: TimelineLogEntry): string {
  return entry.stage === 'Cancelled' || entry.stage === 'Under Discussion with User' ? entry.stage : normalizeToNineStages(entry.stage);
}

/** The figures the answers are built from, for one question. */
class Workbench {
  private auditIds: Set<number>;

  constructor(public data: AssistantData, public now: Date) {
    this.auditIds = new Set(data.auditTenders.map((t) => t.sr_no));
  }

  canSeeMovements(t: Tender): boolean {
    return this.auditIds.has(t.sr_no);
  }

  dateOf(t: Tender, field: DateField): Date | null {
    switch (field) {
      case 'received':
        return parseCustomDate(t.receipt_actionable_pr || t.date_pr_initial_indent || t.timeline?.[0]?.entry_date);
      case 'floated':
        return parseCustomDate(t.tender_floated_on);
      case 'due':
        return parseCustomDate(t.tender_opened_due_on);
      case 'awarded': {
        if (t.brief_status !== 'Awarded') return null;
        const entry = [...(t.timeline || [])].reverse().find((e) => e.stage === 'Awarded');
        return parseCustomDate(entry?.entry_date || t.tec_approval_date);
      }
      case 'cancelled': {
        if (t.brief_status !== 'Cancelled') return null;
        const timeline = t.timeline || [];
        const entry = [...timeline].reverse().find((e) => e.stage === 'Cancelled') || timeline[timeline.length - 1];
        return parseCustomDate(t.cancellation_info?.cancelled_on || entry?.exit_date || entry?.entry_date);
      }
    }
  }

  /** Working days from PR receipt to award, cancellation or today. */
  totalDays(t: Tender): number | null {
    if (t.brief_status === 'Awarded' && t.sla_days) return t.sla_days;
    const start = this.dateOf(t, 'received');
    if (!start) return t.sla_days ?? null;
    const end = this.dateOf(t, 'awarded') || this.dateOf(t, 'cancelled') || this.now;
    return round1(workingMsBetween(start, end) / DAY_MS);
  }

  /** Working days the tender has been in its current stage (all hand-offs within the stage). */
  stageDays(t: Tender): number | null {
    if (!isPipeline(t)) return null;
    const timeline = t.timeline || [];
    let hours = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      const entry = timeline[i];
      const sameStage = entry.stage === t.brief_status || stageOfEntry(entry) === t.brief_status;
      if (!sameStage && i < timeline.length - 1) break;
      hours += getTimelineEntryDuration(entry, this.now).totalHours;
    }
    return round1(hours / 24);
  }

  /** Working days with the current holder. */
  holderDays(t: Tender): number | null {
    const last = t.timeline?.[t.timeline.length - 1];
    if (!isPipeline(t) || !last) return null;
    return round1(getTimelineEntryDuration(last, this.now).totalHours / 24);
  }

  target(stage: string): number | undefined {
    return this.data.slaRules.stageTargetDays?.[stage];
  }

  /** In pipeline and past the stage target, or past the overall SLA target. */
  isDelayed(t: Tender): boolean {
    if (!isPipeline(t)) return false;
    const target = this.target(t.brief_status);
    const inStage = this.stageDays(t) || 0;
    if (target !== undefined && inStage > target) return true;
    return (this.totalDays(t) || 0) > (this.data.slaRules.targetSlaOverallDays || Infinity);
  }

  group(t: Tender): string {
    return t.group || getOfficerGroup(t.pm_officer, this.data.users);
  }

  filter(tenders: Tender[], f: Filters): Tender[] {
    return tenders.filter((t) => {
      if (f.stages && !f.stages.includes(t.brief_status)) return false;
      if (f.status === 'pipeline' && !isPipeline(t)) return false;
      if (f.status === 'awarded' && t.brief_status !== 'Awarded') return false;
      if (f.status === 'cancelled' && t.brief_status !== 'Cancelled') return false;
      if (f.status === 'closed' && !(t.brief_status === 'Awarded' && t.is_closed)) return false;
      if (f.status === 'postAward' && !(t.brief_status === 'Awarded' && !t.is_closed)) return false;
      if (f.holders && !f.holders.some((name) => (isPipeline(t) && lower(t.current_holder) === lower(name)) || holdsEvaluationBidders(t, name))) return false;
      if (f.holderRole) {
        const financeHoldsBidders = f.holderRole === 'FM' && getEvaluationHolders(t).length > 0;
        if (!(isPipeline(t) && (t.current_role === f.holderRole || financeHoldsBidders))) return false;
      }
      if (f.officers && !f.officers.some((name) => isTenderRelatedToUser(t, { name } as UserProfile))) return false;
      if (f.groups && !f.groups.some((g) => lower(this.group(t)) === lower(g))) return false;
      if (f.types && !f.types.some((x) => lower(t.tender_type) === lower(x))) return false;
      if (f.functions && !f.functions.some((x) => lower(t.user_function) === lower(x))) return false;
      if (f.priorities && !f.priorities.includes(t.priority)) return false;
      if (f.delayed && !this.isDelayed(t)) return false;

      const value = t.estimate_value_cr;
      if (f.noEstimate && !(isPipeline(t) && (value === null || value === undefined))) return false;
      if (f.valueMin !== undefined && !(value !== null && value >= f.valueMin)) return false;
      if (f.valueMax !== undefined && !(value !== null && value <= f.valueMax)) return false;
      if (f.ageMin !== undefined || f.ageMax !== undefined) {
        const inStage = this.stageDays(t);
        if (inStage === null) return false;
        if (f.ageMin !== undefined && inStage < f.ageMin) return false;
        if (f.ageMax !== undefined && inStage > f.ageMax) return false;
      }
      if (f.slaMin !== undefined || f.slaMax !== undefined) {
        const total = this.totalDays(t);
        if (total === null) return false;
        if (f.slaMin !== undefined && total < f.slaMin) return false;
        if (f.slaMax !== undefined && total > f.slaMax) return false;
      }
      if (f.date) {
        const d = this.dateOf(t, f.date.field);
        if (!d || d.getTime() < f.date.from || d.getTime() >= f.date.to) return false;
      }
      if (f.words) {
        const description = lower(t.item_description);
        if (!f.words.every((w) => description.includes(w) || (w.endsWith('s') && description.includes(w.slice(0, -1))))) return false;
      }
      return true;
    });
  }

  measure(t: Tender, measure: Measure | 'date'): number | null {
    switch (measure) {
      case 'value':
        return t.estimate_value_cr;
      case 'awarded':
        return t.awarded_value_cr;
      case 'savings':
        return t.savings_due_to_negotiation_cr;
      case 'sla':
        return this.totalDays(t);
      case 'ageing':
        return this.stageDays(t);
      case 'date':
        return this.dateOf(t, 'received')?.getTime() ?? null;
      default:
        return 1;
    }
  }

  measureText(t: Tender, measure: Measure | 'date'): string {
    const value = this.measure(t, measure);
    if (measure === 'date') return dateText(value === null ? null : new Date(value));
    if (measure === 'sla' || measure === 'ageing') return dayText(value);
    return money(value);
  }
}

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

function chipsFor(f: Filters): string[] {
  const chips: string[] = [];
  f.stages?.forEach((s) => chips.push(s));
  if (f.status) chips.push(STATUS_LABEL[f.status]);
  f.holders?.forEach((n) => chips.push(`With ${n}`));
  if (f.holderRole) chips.push(`With ${ROLE_LABEL[f.holderRole]}`);
  f.officers?.forEach((n) => chips.push(n));
  f.groups?.forEach((g) => chips.push(g));
  f.types?.forEach((x) => chips.push(`Type: ${x}`));
  f.functions?.forEach((x) => chips.push(x));
  if (f.priorities) chips.push(`Priority: ${f.priorities.join(' / ')}`);
  if (f.delayed) chips.push('Delayed');
  if (f.noEstimate) chips.push('No estimate');
  if (f.valueMin !== undefined) chips.push(`≥ ${money(f.valueMin)}`);
  if (f.valueMax !== undefined) chips.push(`≤ ${money(f.valueMax)}`);
  if (f.ageMin !== undefined) chips.push(`≥ ${f.ageMin} d in stage`);
  if (f.ageMax !== undefined) chips.push(`≤ ${f.ageMax} d in stage`);
  if (f.slaMin !== undefined) chips.push(`≥ ${f.slaMin} d total`);
  if (f.slaMax !== undefined) chips.push(`≤ ${f.slaMax} d total`);
  if (f.date) chips.push(`${DATE_LABEL[f.date.field]}: ${f.date.label}`);
  f.words?.forEach((w) => chips.push(`“${w}”`));
  return chips;
}

function tenderTable(bench: Workbench, tenders: Tender[], title?: string, extra?: { column: TableColumn; cell: (t: Tender) => string | number }): AnswerBlock {
  const allAwarded = tenders.length > 0 && tenders.every((t) => t.brief_status === 'Awarded');
  const allCancelled = tenders.length > 0 && tenders.every((t) => t.brief_status === 'Cancelled');
  let columns: TableColumn[];
  let cells: (t: Tender) => Record<string, string | number>;

  if (allAwarded) {
    columns = [
      { key: 'pr', label: 'PR No', mono: true },
      { key: 'item', label: 'Item Description' },
      { key: 'on', label: 'Awarded On', mono: true },
      { key: 'estimate', label: 'Estimate', align: 'right' },
      { key: 'awarded', label: 'Awarded Value', align: 'right' },
      { key: 'savings', label: 'Savings', align: 'right' },
      { key: 'total', label: 'SLA', align: 'right' },
    ];
    cells = (t) => ({
      pr: t.pr_no,
      item: t.item_description,
      on: dateText(bench.dateOf(t, 'awarded')),
      estimate: money(t.estimate_value_cr),
      awarded: money(t.awarded_value_cr),
      savings: money(t.savings_due_to_negotiation_cr),
      total: dayText(bench.totalDays(t)),
    });
  } else if (allCancelled) {
    columns = [
      { key: 'pr', label: 'PR No', mono: true },
      { key: 'item', label: 'Item Description' },
      { key: 'on', label: 'Cancelled On', mono: true },
      { key: 'stage', label: 'Stage' },
      { key: 'estimate', label: 'Estimate', align: 'right' },
      { key: 'reason', label: 'Reason' },
    ];
    cells = (t) => ({
      pr: t.pr_no,
      item: t.item_description,
      on: dateText(bench.dateOf(t, 'cancelled')),
      stage: t.cancellation_info?.stage_at_cancellation || '—',
      estimate: money(t.estimate_value_cr),
      reason: t.cancellation_info?.reason || t.remarks || '—',
    });
  } else {
    columns = [
      { key: 'pr', label: 'PR No', mono: true },
      { key: 'item', label: 'Item Description' },
      { key: 'stage', label: 'Stage' },
      { key: 'with', label: 'With' },
      { key: 'estimate', label: 'Estimate', align: 'right' },
      { key: 'inStage', label: 'In Stage', align: 'right' },
      { key: 'total', label: 'Total Days', align: 'right' },
    ];
    cells = (t) => ({
      pr: t.pr_no,
      item: t.item_description,
      stage: t.brief_status,
      with: isPipeline(t) && t.current_holder ? `${t.current_holder} (${t.current_role})` : '—',
      estimate: money(t.estimate_value_cr),
      inStage: dayText(bench.stageDays(t)),
      total: dayText(bench.totalDays(t)),
    });
  }

  if (extra) columns = [...columns.slice(0, 2), extra.column, ...columns.slice(2)];
  const rows: TableRow[] = tenders.map((t) => ({
    srNo: t.sr_no,
    cells: extra ? { ...cells(t), [extra.column.key]: extra.cell(t) } : cells(t),
  }));
  return { type: 'table', title, columns, rows };
}

function movementsTable(bench: Workbench, t: Tender): AnswerBlock {
  const entries = getEffectiveTimeline(t, bench.now);
  return {
    type: 'table',
    title: 'File Movements',
    columns: [
      { key: 'n', label: '#' },
      { key: 'stage', label: 'Stage' },
      { key: 'officer', label: 'Officer' },
      { key: 'entry', label: 'Entry Date', mono: true },
      { key: 'exit', label: 'Exit Date', mono: true },
      { key: 'time', label: 'Duration', align: 'right' },
      { key: 'remarks', label: 'Remarks' },
    ],
    rows: entries.map((e, i) => ({
      cells: {
        n: i + 1,
        stage: e.sub_stage ? `${stageOfEntry(e)} · ${e.sub_stage}` : stageOfEntry(e),
        officer: `${e.holder} (${e.role})`,
        entry: e.entry_date,
        exit: e.exit_date || 'Current',
        time: getTimelineEntryDuration(e, bench.now).compactDisplay,
        remarks: e.remarks || '—',
      },
    })),
  };
}

/** Working days per workflow stage for one tender, from its effective timeline. */
function daysByStage(bench: Workbench, t: Tender): Map<string, number> {
  const result = new Map<string, number>();
  getEffectiveTimeline(t, bench.now).forEach((e) => {
    const stage = stageOfEntry(e);
    if (stage === 'Awarded' || stage === 'Cancelled') return;
    result.set(stage, (result.get(stage) || 0) + getTimelineEntryDuration(e, bench.now).totalHours / 24);
  });
  return result;
}

function examples(data: AssistantData): string[] {
  const sample = data.tenders.find(isPipeline) || data.tenders[0];
  const groups = Array.from(new Set(data.groups.filter((g) => g.type === 'Procurement').map((g) => g.name))).slice(0, 2);
  return [
    sample ? `Status of ${sample.pr_no}` : 'All tenders',
    'Summary',
    'My pending tenders',
    'Delayed tenders',
    'Tenders by stage',
    'Which stage is the bottleneck?',
    'How many tenders are with finance?',
    'Workload by officer',
    'Top 5 tenders by value',
    'Average SLA by type',
    'Savings by group',
    groups.length === 2 ? `Compare ${groups[0]} and ${groups[1]}` : 'Tenders awarded this year',
  ];
}

export function exampleQuestions(data: AssistantData): string[] {
  return examples(data);
}

// ---------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------

interface Result {
  blocks: AnswerBlock[];
  suggestions: string[];
}

function tenderAnswer(bench: Workbench, t: Tender, focus: Query['tenderFocus'], lead?: string, asked?: DateField): Result {
  const blocks: AnswerBlock[] = [];
  const pipeline = isPipeline(t);
  const financeHolders = getEvaluationHolders(t);

  let headline: string;
  if (t.brief_status === 'Cancelled') {
    const reason = t.cancellation_info?.reason;
    headline = `**${t.pr_no}** was cancelled on ${dateText(bench.dateOf(t, 'cancelled'))}${reason ? `: ${reason}` : ''}.`;
  } else if (t.brief_status === 'Awarded') {
    headline = `**${t.pr_no}** was awarded on ${dateText(bench.dateOf(t, 'awarded'))} for **${money(t.awarded_value_cr)}**.`;
  } else {
    headline = `**${t.pr_no}** is at **${t.brief_status}** with **${t.current_holder}** (${t.current_role}) for ${dayText(bench.holderDays(t))}.`;
    if (financeHolders.length > 0) headline += ` Bidders are with ${financeHolders.join(', ')}.`;
  }
  if (focus === 'delay' && pipeline) {
    const target = bench.target(t.brief_status);
    const inStage = bench.stageDays(t) || 0;
    const total = bench.totalDays(t) || 0;
    const overall = bench.data.slaRules.targetSlaOverallDays;
    if (target !== undefined && inStage > target) {
      headline = `**${t.pr_no}** is delayed: **${dayText(inStage)}** at ${t.brief_status} against a target of ${target} d. It is with ${t.current_holder} (${t.current_role}).`;
    } else if (overall && total > overall) {
      headline = `**${t.pr_no}** is delayed: **${dayText(total)}** since PR receipt against the ${overall}-day SLA. It is with ${t.current_holder} (${t.current_role}).`;
    } else {
      headline = `**${t.pr_no}** is within target: ${dayText(inStage)} at ${t.brief_status}${target !== undefined ? ` (target ${target} d)` : ''}, ${dayText(total)} in total.`;
    }
  }
  if (focus === 'dates' && asked) {
    const d = bench.dateOf(t, asked);
    const verb = { received: 'was received', floated: 'was floated', due: d && d > bench.now ? 'is due' : 'was due', awarded: 'was awarded', cancelled: 'was cancelled' }[asked];
    headline = d ? `**${t.pr_no}** ${verb} on **${dateText(d)}**.` : `**${t.pr_no}** has no ${DATE_LABEL[asked].toLowerCase()} date yet.`;
  }
  blocks.push({ type: 'text', text: lead ? `${lead} ${headline}` : headline });
  blocks.push({ type: 'tender', srNo: t.sr_no });

  if (focus !== 'timeline' && focus !== 'bidders') {
    const steps = t.post_award_steps || [];
    blocks.push({
      type: 'stats',
      items: pipeline
        ? [
            { label: 'Stage', value: t.brief_status },
            { label: 'With', value: `${t.current_holder} (${t.current_role})` },
            { label: 'In Stage', value: dayText(bench.stageDays(t)) },
            { label: 'Total Days', value: dayText(bench.totalDays(t)) },
            { label: 'Estimate', value: money(t.estimate_value_cr) },
            { label: 'Priority', value: t.priority },
          ]
        : t.brief_status === 'Awarded'
        ? [
            { label: 'Awarded On', value: dateText(bench.dateOf(t, 'awarded')) },
            { label: 'SLA', value: dayText(bench.totalDays(t)) },
            { label: 'Estimate', value: money(t.estimate_value_cr) },
            { label: 'Awarded Value', value: money(t.awarded_value_cr) },
            { label: 'Savings', value: money(t.savings_due_to_negotiation_cr) },
            { label: 'Post-Award', value: t.is_closed ? 'Closed' : steps.length === 0 ? 'Open' : `${steps.filter((s) => s.completed).length} / ${steps.length} done` },
          ]
        : [
            { label: 'Cancelled On', value: dateText(bench.dateOf(t, 'cancelled')) },
            { label: 'Stage', value: t.cancellation_info?.stage_at_cancellation || '—' },
            { label: 'By', value: t.cancellation_info?.cancelled_by || '—' },
            { label: 'Estimate', value: money(t.estimate_value_cr) },
          ],
    });
  }

  if (!focus || focus === 'dates' || focus === 'holder') {
    blocks.push({
      type: 'stats',
      items: [
        { label: 'PR Received', value: dateText(bench.dateOf(t, 'received')) },
        { label: 'Floated', value: dateText(bench.dateOf(t, 'floated')) },
        { label: 'Due', value: dateText(bench.dateOf(t, 'due')) },
        { label: 'PM', value: t.pm_officer || '—' },
        { label: 'Finance', value: (t.attached_fms || []).join(', ') || '—' },
        { label: 'Estimation', value: (t.attached_cec_officers || []).join(', ') || '—' },
      ],
    });
  }

  if ((t.evaluation?.bidders?.length || 0) > 0 && (!focus || focus === 'bidders' || focus === 'holder')) {
    const split = computeEvaluationSplit(t, bench.now);
    const creator = t.created_by || t.pm_officer;
    blocks.push({
      type: 'table',
      title: `EMD & BQC Evaluation · ${plural(t.evaluation!.bidders.length, 'bidder')}`,
      columns: [
        { key: 'sub', label: 'Sub-stage' },
        { key: 'creator', label: `With ${creator}` },
        { key: 'finance', label: 'With Finance' },
        { key: 'creatorTime', label: 'Creator Time', align: 'right' },
        { key: 'financeTime', label: 'Finance Time', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
      rows: split.subStages.map((s) => ({
        cells: {
          sub: s.subStage,
          creator: s.withCreator.join(', ') || '—',
          finance: s.withFinance.map((f) => `${f.officer}: ${f.bidders.join(', ')}`).join('; ') || '—',
          creatorTime: dayText(round1(s.creatorHours / 24)),
          financeTime: dayText(round1(sumOf(s.financeHours, (f) => f.hours) / 24)),
          status: s.completedOn ? `Completed ${s.completedOn}` : 'In progress',
        },
      })),
    });
  } else if (focus === 'bidders') {
    blocks.push({ type: 'text', text: 'No bidders are recorded for this tender.' });
  }

  if (bench.canSeeMovements(t)) {
    if (focus === 'time') {
      const perStage = daysByStage(bench, t);
      blocks.push({
        type: 'bars',
        title: 'Days by Stage',
        items: Array.from(perStage, ([label, value]) => ({ label, value: round1(value), display: dayText(round1(value)) })),
      });
      blocks.push({
        type: 'stats',
        items: (['PM', 'FM', 'CEC'] as const).map((role) => ({ label: `${ROLE_LABEL[role]} Days`, value: dayText(t.days_by_role?.[role] ?? 0) })),
      });
    }
    if (!focus || focus === 'timeline' || focus === 'time') blocks.push(movementsTable(bench, t));
  } else if (focus === 'timeline' || focus === 'time') {
    blocks.push({ type: 'text', text: 'File movements are shown only to the officers on this tender and to head level.' });
  }

  const suggestions = [`Timeline of ${t.pr_no}`];
  if (pipeline && t.current_holder) suggestions.push(`Tenders with ${t.current_holder}`);
  if (pipeline) suggestions.push(`Tenders at ${t.brief_status}`);
  if (t.pm_officer) suggestions.push(`Workload of ${t.pm_officer}`);
  return { blocks, suggestions: suggestions.filter((s) => !(focus === 'timeline' && s.startsWith('Timeline'))) };
}

function followUps(query: Query, count: number): string[] {
  if (count < 2) return [];
  const settled = query.filters.status === 'awarded' || query.filters.status === 'cancelled' || query.filters.status === 'closed';
  const options = ['By stage', 'By group', 'By officer', 'Total value', 'Which of these are delayed?', 'Top 5 by value'];
  return options.filter((option) => {
    if (option === 'By stage' && (settled || query.groupBy === 'stage' || query.filters.stages?.length === 1)) return false;
    if (option === 'By group' && (!settled || query.groupBy === 'group' || query.filters.groups?.length === 1)) return false;
    if (option === 'By officer' && query.groupBy === 'officer') return false;
    if (option === 'Total value' && query.intent === 'total') return false;
    if (option.startsWith('Which') && (query.filters.delayed || settled)) return false;
    if (option.startsWith('Top') && query.intent === 'top') return false;
    return true;
  });
}

function listAnswer(bench: Workbench, query: Query, set: Tender[]): Result {
  const all = bench.data.tenders.length;
  const value = sumOf(set, (t) => t.estimate_value_cr);
  const blocks: AnswerBlock[] = [];
  const filtered = Object.keys(query.filters).length > 0;

  if (query.intent === 'count') {
    blocks.push({ type: 'text', text: `**${plural(set.length, 'tender')}**${filtered ? ` of ${all} (${percent(set.length, all)})` : ''} · ${money(value)}` });
  } else if (query.intent === 'total' && query.measure === 'savings') {
    const awarded = set.filter((t) => t.brief_status === 'Awarded' && t.savings_due_to_negotiation_cr);
    const savings = sumOf(awarded, (t) => t.savings_due_to_negotiation_cr);
    const estimate = sumOf(awarded, (t) => t.estimate_value_cr);
    blocks.push({ type: 'text', text: `Savings: **${money(savings)}** on ${plural(awarded.length, 'awarded tender')} (${percent(savings, estimate)} of their estimate).` });
    return {
      blocks: [...blocks, tenderTable(bench, [...awarded].sort((a, b) => (b.savings_due_to_negotiation_cr || 0) - (a.savings_due_to_negotiation_cr || 0)))],
      suggestions: ['Savings by group', 'Savings by officer', 'Savings by type'],
    };
  } else if (query.intent === 'total' && query.measure === 'awarded') {
    const awarded = set.filter((t) => t.brief_status === 'Awarded');
    blocks.push({ type: 'text', text: `Awarded value: **${money(sumOf(awarded, (t) => t.awarded_value_cr))}** on ${plural(awarded.length, 'tender')}.` });
    return { blocks: [...blocks, tenderTable(bench, awarded)], suggestions: followUps(query, awarded.length) };
  } else if (query.intent === 'average' || (query.intent === 'total' && (query.measure === 'sla' || query.measure === 'ageing'))) {
    if (query.measure === 'value') {
      const priced = set.filter((t) => t.estimate_value_cr !== null);
      blocks.push({ type: 'text', text: `Average estimate: **${money(priced.length ? value / priced.length : null)}** over ${plural(priced.length, 'tender')}.` });
    } else if (query.measure === 'savings') {
      const awarded = set.filter((t) => t.savings_due_to_negotiation_cr);
      blocks.push({ type: 'text', text: `Average savings: **${money(awarded.length ? sumOf(awarded, (t) => t.savings_due_to_negotiation_cr) / awarded.length : null)}** over ${plural(awarded.length, 'awarded tender')}.` });
    } else if (query.measure === 'ageing') {
      const inStage = set.filter(isPipeline).map((t) => bench.stageDays(t) || 0);
      blocks.push({ type: 'text', text: `Average time in the current stage: **${dayText(averageOf(inStage))}** over ${plural(inStage.length, 'tender')} in pipeline.` });
    } else {
      const awarded = set.filter((t) => t.brief_status === 'Awarded').map((t) => bench.totalDays(t) || 0);
      const running = set.filter(isPipeline).map((t) => bench.totalDays(t) || 0);
      const parts: string[] = [];
      if (awarded.length) parts.push(`Average SLA of ${plural(awarded.length, 'awarded tender')}: **${dayText(averageOf(awarded))}** (fastest ${dayText(Math.min(...awarded))}, slowest ${dayText(Math.max(...awarded))}).`);
      if (running.length) parts.push(`${plural(running.length, 'tender')} in pipeline: **${dayText(averageOf(running))}** so far on average.`);
      blocks.push({ type: 'text', text: parts.join(' ') || 'No tenders match.' });
    }
  } else if (query.intent === 'total') {
    blocks.push({ type: 'text', text: `Estimate value: **${money(value)}** across ${plural(set.length, 'tender')}.` });
    const awarded = set.filter((t) => t.brief_status === 'Awarded');
    const pipeline = set.filter(isPipeline);
    const cancelled = set.filter((t) => t.brief_status === 'Cancelled');
    if ([pipeline, awarded, cancelled].filter((part) => part.length > 0).length > 1) {
      blocks.push({
        type: 'stats',
        items: [
          { label: `In Pipeline (${pipeline.length})`, value: money(sumOf(pipeline, (t) => t.estimate_value_cr)) },
          { label: `Awarded (${awarded.length})`, value: money(sumOf(awarded, (t) => t.estimate_value_cr)) },
          { label: 'Awarded Value', value: money(sumOf(awarded, (t) => t.awarded_value_cr)) },
          { label: `Cancelled (${cancelled.length})`, value: money(sumOf(cancelled, (t) => t.estimate_value_cr)) },
        ],
      });
    }
  } else {
    blocks.push({ type: 'text', text: `**${plural(set.length, 'tender')}** · ${money(value)}` });
  }

  const ordered = query.filters.delayed ? [...set].sort((a, b) => (bench.stageDays(b) || 0) - (bench.stageDays(a) || 0)) : set;
  blocks.push(tenderTable(bench, ordered));
  return { blocks, suggestions: followUps(query, set.length) };
}

function groupKey(bench: Workbench, t: Tender, by: GroupBy, dateField: DateField): string {
  switch (by) {
    case 'stage':
      return t.brief_status;
    case 'status':
      return isPipeline(t) ? 'In pipeline' : t.brief_status;
    case 'officer':
      return t.pm_officer || '—';
    case 'holder':
      return t.current_holder || '—';
    case 'group':
      return bench.group(t);
    case 'type':
      return t.tender_type || '—';
    case 'function':
      return t.user_function || '—';
    case 'role':
      return ROLE_LABEL[t.current_role] || '—';
    case 'priority':
      return t.priority || '—';
    case 'month': {
      const d = bench.dateOf(t, dateField);
      return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : '—';
    }
  }
}

function breakdownAnswer(bench: Workbench, query: Query, base: Tender[]): Result {
  const by = query.groupBy!;
  const measure: Measure = query.measure || 'count';
  // Who holds a file only makes sense for files still moving
  const set = by === 'holder' || by === 'role' ? base.filter(isPipeline) : base;
  const dateField: DateField = query.filters.date?.field || (query.filters.status === 'awarded' ? 'awarded' : 'received');

  const groups = new Map<string, Tender[]>();
  set.forEach((t) => {
    const key = groupKey(bench, t, by, dateField);
    groups.set(key, [...(groups.get(key) || []), t]);
  });

  const figure = (items: Tender[]): number | null => {
    if (measure === 'count') return items.length;
    if (measure === 'sla' || measure === 'ageing') {
      const hasAwarded = set.some((t) => t.brief_status === 'Awarded');
      const relevant = measure === 'ageing' ? items.filter(isPipeline) : hasAwarded ? items.filter((t) => t.brief_status === 'Awarded') : items;
      return averageOf(relevant.map((t) => bench.measure(t, measure) || 0));
    }
    return Math.round(sumOf(items, (t) => bench.measure(t, measure)) * 100) / 100;
  };
  const figureText = (n: number) => (measure === 'count' ? String(n) : measure === 'sla' || measure === 'ageing' ? dayText(n) : money(n));

  const all = Array.from(groups, ([key, items]) => ({ key, items, figure: figure(items) }));
  // Groups with a figure drive the chart; the rest still appear in the table
  let entries = all.filter((e): e is { key: string; items: Tender[]; figure: number } => e.figure !== null);
  const withoutFigure = all.filter((e) => e.figure === null);
  if (by === 'stage') {
    const order = [...STAGE_STEPS, 'Under Discussion with User', 'Cancelled'];
    entries.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  } else if (by === 'month') {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    entries.sort((a, b) => b.figure - a.figure || b.items.length - a.items.length);
  }
  const label = (key: string) => {
    if (by !== 'month' || key === '—') return key;
    const [year, month] = key.split('-');
    return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
  };

  const dimension = { stage: 'Stage', status: 'Status', officer: 'PM Officer', holder: 'Holder', group: 'Group', type: 'Type', function: 'User Function', role: 'Team', month: `${DATE_LABEL[dateField]} Month`, priority: 'Priority' }[by];
  const slaOnAwarded = set.some((t) => t.brief_status === 'Awarded');
  const measureTitle = measure === 'sla' ? (slaOnAwarded ? 'Avg SLA (Awarded)' : 'Avg Total Days') : measure === 'ageing' ? 'Avg Days in Stage' : MEASURE_LABEL[measure];
  const top = [...entries].sort((a, b) => b.figure - a.figure)[0];
  const whole = measure === 'count' ? set.length : sumOf(entries, (e) => e.figure);

  const blocks: AnswerBlock[] = [];
  if (!top) {
    return { blocks: [{ type: 'text', text: 'No tenders match.' }], suggestions: [] };
  }
  blocks.push({
    type: 'text',
    text:
      measure === 'count'
        ? `**${label(top.key)}** has the most: ${top.items.length} of ${plural(set.length, 'tender')} (${percent(top.items.length, set.length)}).`
        : measure === 'sla' || measure === 'ageing'
        ? `**${label(top.key)}** is the longest: ${figureText(top.figure)} on average.`
        : `**${label(top.key)}** is the highest: ${figureText(top.figure)} of ${figureText(whole)} (${percent(top.figure, whole)}).`,
  });
  blocks.push({ type: 'bars', title: `${measureTitle} by ${dimension}`, items: entries.map((e) => ({ label: label(e.key), value: e.figure, display: figureText(e.figure) })) });

  const columns: TableColumn[] = [
    { key: 'name', label: dimension },
    { key: 'count', label: 'Tenders', align: 'right' },
    { key: 'share', label: 'Share', align: 'right' },
    { key: 'estimate', label: 'Estimate', align: 'right' },
  ];
  if (measure === 'savings' || measure === 'awarded') columns.push({ key: 'awarded', label: 'Awarded Value', align: 'right' }, { key: 'savings', label: 'Savings', align: 'right' });
  columns.push({ key: 'sla', label: 'Avg SLA (Awarded)', align: 'right' }, { key: 'days', label: 'Avg Days in Stage', align: 'right' });
  blocks.push({
    type: 'table',
    columns,
    rows: [...entries, ...withoutFigure].map((e) => ({
      cells: {
        name: label(e.key),
        count: e.items.length,
        share: percent(e.items.length, set.length),
        estimate: money(sumOf(e.items, (t) => t.estimate_value_cr)),
        awarded: money(sumOf(e.items, (t) => t.awarded_value_cr)),
        savings: money(sumOf(e.items, (t) => t.savings_due_to_negotiation_cr)),
        sla: dayText(averageOf(e.items.filter((t) => t.brief_status === 'Awarded').map((t) => bench.totalDays(t) || 0))),
        days: dayText(averageOf(e.items.filter(isPipeline).map((t) => bench.stageDays(t) || 0))),
      },
    })),
  });

  const others = (['stage', 'officer', 'group', 'type'] as GroupBy[]).filter((g) => g !== by).map((g) => `By ${g}`);
  return { blocks, suggestions: [...others, 'Which of these are delayed?'] };
}

function topAnswer(bench: Workbench, query: Query, base: Tender[]): Result {
  const sort = query.sort!;
  const set = base.filter((t) => bench.measure(t, sort.by) !== null);
  const sorted = [...set].sort((a, b) => {
    const diff = (bench.measure(a, sort.by) || 0) - (bench.measure(b, sort.by) || 0);
    return sort.dir === 'desc' ? -diff : diff;
  });
  const top = sorted.slice(0, query.limit || 5);
  if (top.length === 0) return { blocks: [{ type: 'text', text: 'No tenders match.' }], suggestions: [] };

  const title = MEASURE_LABEL[sort.by];
  if (top.length === 1) {
    return tenderAnswer(bench, top[0], undefined, `${title}: **${bench.measureText(top[0], sort.by)}**.`);
  }
  const adjective =
    sort.by === 'date'
      ? sort.dir === 'desc' ? 'Latest' : 'Earliest'
      : sort.by === 'sla' || sort.by === 'ageing'
      ? sort.dir === 'desc' ? 'Longest' : 'Fastest'
      : sort.dir === 'desc' ? 'Top' : 'Lowest';
  return {
    blocks: [
      {
        type: 'text',
        text:
          top.length === set.length
            ? `**${plural(set.length, 'tender')}** by ${title.toLowerCase()}, ${sort.dir === 'desc' ? 'highest' : 'lowest'} first.`
            : `${adjective} **${top.length}** of ${plural(set.length, 'tender')} by ${title.toLowerCase()}.`,
      },
      tenderTable(
        bench,
        top,
        undefined,
        (top.every((t) => t.brief_status === 'Awarded') ? ['value', 'awarded', 'savings', 'sla'] : ['value', 'ageing', 'sla']).includes(sort.by)
          ? undefined
          : { column: { key: 'rankValue', label: title, align: 'right' }, cell: (t) => bench.measureText(t, sort.by) }
      ),
    ],
    suggestions: ['By stage', 'By officer'],
  };
}

function insights(bench: Workbench, set: Tender[]): string[] {
  const lines: string[] = [];
  const pipeline = set.filter(isPipeline);
  const awarded = set.filter((t) => t.brief_status === 'Awarded');
  const cancelled = set.filter((t) => t.brief_status === 'Cancelled');

  if (pipeline.length > 0) {
    const perStage = new Map<string, Tender[]>();
    pipeline.forEach((t) => perStage.set(t.brief_status, [...(perStage.get(t.brief_status) || []), t]));
    const [stage, items] = Array.from(perStage).sort((a, b) => b[1].length - a[1].length)[0];
    lines.push(`**${stage}** holds the most tenders in pipeline: ${items.length} of ${pipeline.length} (${percent(items.length, pipeline.length)}).`);

    const waiting = [...pipeline].sort((a, b) => (bench.holderDays(b) || 0) - (bench.holderDays(a) || 0))[0];
    lines.push(`Longest wait: **${waiting.pr_no}** with ${waiting.current_holder} (${waiting.current_role}) for ${dayText(bench.holderDays(waiting))} at ${waiting.brief_status}.`);

    const perHolder = new Map<string, Tender[]>();
    pipeline.forEach((t) => t.current_holder && perHolder.set(t.current_holder, [...(perHolder.get(t.current_holder) || []), t]));
    const busiest = Array.from(perHolder).sort((a, b) => b[1].length - a[1].length)[0];
    if (busiest && busiest[1].length > 1) lines.push(`**${busiest[0]}** holds the most files: ${busiest[1].length} (${money(sumOf(busiest[1], (t) => t.estimate_value_cr))}).`);

    const byRole = (role: UserRole) => pipeline.filter((t) => t.current_role === role).length;
    lines.push(`Files in pipeline are with Procurement ${byRole('PM')}, Finance ${byRole('FM')}, Estimation ${byRole('CEC')}.`);

    const delayed = pipeline.filter((t) => bench.isDelayed(t));
    if (delayed.length > 0) lines.push(`**${delayed.length}** of ${pipeline.length} tenders in pipeline are past their stage target or the ${bench.data.slaRules.targetSlaOverallDays}-day SLA.`);

    const byValue = [...pipeline].sort((a, b) => (b.estimate_value_cr || 0) - (a.estimate_value_cr || 0));
    const total = sumOf(pipeline, (t) => t.estimate_value_cr);
    if (pipeline.length > 3 && total > 0) lines.push(`The 3 largest tenders carry ${percent(sumOf(byValue.slice(0, 3), (t) => t.estimate_value_cr), total)} of the pipeline value.`);
  }

  if (awarded.length > 0) {
    const days = awarded.map((t) => ({ t, days: bench.totalDays(t) || 0 })).sort((a, b) => a.days - b.days);
    lines.push(`Awarded tenders took **${dayText(averageOf(days.map((d) => d.days)))}** on average: fastest ${days[0].t.pr_no} (${dayText(days[0].days)}), slowest ${days[days.length - 1].t.pr_no} (${dayText(days[days.length - 1].days)}).`);

    const savings = sumOf(awarded, (t) => t.savings_due_to_negotiation_cr);
    if (savings > 0) lines.push(`Negotiation saved **${money(savings)}**, ${percent(savings, sumOf(awarded, (t) => t.estimate_value_cr))} of the estimate of awarded tenders.`);

    const roleDays = (role: 'PM' | 'FM' | 'CEC') => sumOf(awarded, (t) => t.days_by_role?.[role]);
    const allDays = roleDays('PM') + roleDays('FM') + roleDays('CEC');
    if (allDays > 0) lines.push(`On awarded tenders the file was with Procurement ${percent(roleDays('PM'), allDays)}, Finance ${percent(roleDays('FM'), allDays)}, Estimation ${percent(roleDays('CEC'), allDays)} of the time.`);

    const open = awarded.filter((t) => !t.is_closed).length;
    if (open > 0) lines.push(`${plural(open, 'awarded tender')} still ${open === 1 ? 'has' : 'have'} post-award work open.`);
  }

  if (cancelled.length > 0) {
    lines.push(`${plural(cancelled.length, 'tender')} cancelled, worth ${money(sumOf(cancelled, (t) => t.estimate_value_cr))}.`);
  }
  return lines;
}

function summaryAnswer(bench: Workbench, set: Tender[]): Result {
  const pipeline = set.filter(isPipeline);
  const awarded = set.filter((t) => t.brief_status === 'Awarded');
  const cancelled = set.filter((t) => t.brief_status === 'Cancelled');
  const delayed = pipeline.filter((t) => bench.isDelayed(t));
  const blocks: AnswerBlock[] = [
    { type: 'text', text: `**${plural(set.length, 'tender')}**: ${pipeline.length} in pipeline, ${awarded.length} awarded, ${cancelled.length} cancelled.` },
    {
      type: 'stats',
      items: [
        { label: 'Pipeline Value', value: money(sumOf(pipeline, (t) => t.estimate_value_cr)) },
        { label: 'Awarded Value', value: money(sumOf(awarded, (t) => t.awarded_value_cr)) },
        { label: 'Savings', value: money(sumOf(awarded, (t) => t.savings_due_to_negotiation_cr)) },
        { label: 'Avg SLA (Awarded)', value: dayText(averageOf(awarded.map((t) => bench.totalDays(t) || 0))) },
        { label: 'Delayed', value: `${delayed.length} of ${pipeline.length}` },
        { label: 'Post-Award Open', value: String(awarded.filter((t) => !t.is_closed).length) },
      ],
    },
  ];

  if (pipeline.length > 0) {
    const order = [...STAGE_STEPS, 'Under Discussion with User'];
    const counts = order.map((stage) => ({ stage, count: pipeline.filter((t) => t.brief_status === stage).length })).filter((s) => s.count > 0);
    blocks.push({ type: 'bars', title: 'Pipeline by Stage', items: counts.map((s) => ({ label: s.stage, value: s.count, display: String(s.count) })) });
  }
  const findings = insights(bench, set);
  if (findings.length > 0) blocks.push({ type: 'list', title: 'Findings', items: findings });
  if (pipeline.length > 0) {
    const longest = [...pipeline].sort((a, b) => (bench.stageDays(b) || 0) - (bench.stageDays(a) || 0)).slice(0, 5);
    blocks.push(tenderTable(bench, longest, 'Longest in Stage'));
  }
  return { blocks, suggestions: ['Which stage is the bottleneck?', 'Delayed tenders', 'Workload by officer', 'Savings by group', 'Tenders by stage'] };
}

function bottleneckAnswer(bench: Workbench, query: Query): Result {
  const { stages, ...rest } = query.filters;
  const set = bench.filter(bench.data.auditTenders, rest);
  const focusStage = stages?.[0];
  if (set.length === 0) return { blocks: [{ type: 'text', text: 'No file movements to analyse.' }], suggestions: [] };

  const stageNames = STAGE_STEPS.filter((s) => s !== 'Awarded');
  const perTender = set.map((t) => ({ t, days: daysByStage(bench, t) }));
  const rows = stageNames
    .map((stage) => {
      const passed = perTender.filter((p) => p.days.has(stage));
      const now = set.filter((t) => t.brief_status === stage);
      return {
        stage,
        passed: passed.length,
        average: averageOf(passed.map((p) => p.days.get(stage) || 0)),
        target: bench.target(stage),
        now: now.length,
        nowAverage: averageOf(now.map((t) => bench.stageDays(t) || 0)),
      };
    })
    .filter((r) => r.passed > 0);
  if (rows.length === 0) return { blocks: [{ type: 'text', text: 'No file movements to analyse.' }], suggestions: [] };

  const blocks: AnswerBlock[] = [];
  const subject = focusStage ? rows.find((r) => r.stage === focusStage) : [...rows].sort((a, b) => (b.average || 0) - (a.average || 0))[0];
  if (subject) {
    const against = subject.target !== undefined ? ` against a target of ${subject.target} d` : '';
    blocks.push({
      type: 'text',
      text: focusStage
        ? `**${subject.stage}** takes **${dayText(subject.average)}** on average over ${plural(subject.passed, 'tender')}${against}.`
        : `**${subject.stage}** takes the longest: **${dayText(subject.average)}** on average${against}.`,
    });
  } else {
    blocks.push({ type: 'text', text: `No tender has been through ${focusStage}.` });
  }

  blocks.push({ type: 'bars', title: 'Average Days per Stage', items: rows.map((r) => ({ label: r.stage, value: r.average || 0, display: dayText(r.average) })) });
  blocks.push({
    type: 'table',
    columns: [
      { key: 'stage', label: 'Stage' },
      { key: 'passed', label: 'Tenders', align: 'right' },
      { key: 'average', label: 'Avg Days', align: 'right' },
      { key: 'target', label: 'Target', align: 'right' },
      { key: 'now', label: 'In Stage Now', align: 'right' },
      { key: 'nowAverage', label: 'Avg Days (Now)', align: 'right' },
    ],
    rows: rows.map((r) => ({
      cells: { stage: r.stage, passed: r.passed, average: dayText(r.average), target: r.target !== undefined ? `${r.target} d` : '—', now: r.now, nowAverage: dayText(r.nowAverage) },
    })),
  });

  if (focusStage) {
    const perOfficer = new Map<string, { role: string; stints: number; days: number }>();
    set.forEach((t) =>
      getEffectiveTimeline(t, bench.now).forEach((e) => {
        if (stageOfEntry(e) !== focusStage) return;
        const entry = perOfficer.get(e.holder) || { role: e.role, stints: 0, days: 0 };
        entry.stints += 1;
        entry.days += getTimelineEntryDuration(e, bench.now).totalHours / 24;
        perOfficer.set(e.holder, entry);
      })
    );
    blocks.push({
      type: 'table',
      title: `${focusStage}: Time by Officer`,
      columns: [
        { key: 'officer', label: 'Officer' },
        { key: 'role', label: 'Role' },
        { key: 'stints', label: 'Times Held', align: 'right' },
        { key: 'total', label: 'Total Days', align: 'right' },
        { key: 'average', label: 'Avg Days', align: 'right' },
      ],
      rows: Array.from(perOfficer)
        .sort((a, b) => b[1].days / b[1].stints - a[1].days / a[1].stints)
        .map(([officer, v]) => ({ cells: { officer, role: v.role, stints: v.stints, total: dayText(round1(v.days)), average: dayText(round1(v.days / v.stints)) } })),
    });
  }
  return { blocks, suggestions: ['Time by role', 'Delayed tenders', 'Workload by officer'] };
}

function roleTimeAnswer(bench: Workbench, query: Query): Result {
  const { holderRole, ...rest } = query.filters;
  const set = bench.filter(bench.data.auditTenders, rest);
  const roles: UserRole[] = ['PM', 'FM', 'CEC'];
  const totals = new Map<UserRole, { days: number; tenders: Set<number> }>(roles.map((r) => [r, { days: 0, tenders: new Set<number>() }]));
  const perOfficer = new Map<string, { role: UserRole; stints: number; days: number }>();

  set.forEach((t) =>
    getEffectiveTimeline(t, bench.now).forEach((e) => {
      const total = totals.get(e.role);
      if (!total || e.stage === 'Awarded' || e.stage === 'Cancelled') return;
      const days = getTimelineEntryDuration(e, bench.now).totalHours / 24;
      total.days += days;
      total.tenders.add(t.sr_no);
      const officer = perOfficer.get(e.holder) || { role: e.role, stints: 0, days: 0 };
      officer.stints += 1;
      officer.days += days;
      perOfficer.set(e.holder, officer);
    })
  );
  const allDays = sumOf(roles, (r) => totals.get(r)!.days);
  if (allDays === 0) return { blocks: [{ type: 'text', text: 'No file movements to analyse.' }], suggestions: [] };

  const blocks: AnswerBlock[] = [];
  const role = query.role || holderRole;
  if (role && totals.has(role)) {
    const total = totals.get(role)!;
    blocks.push({
      type: 'text',
      text: `**${ROLE_LABEL[role]}** held files for **${dayText(round1(total.days / Math.max(1, total.tenders.size)))}** per tender on average, ${percent(total.days, allDays)} of the time across ${plural(set.length, 'tender')}.`,
    });
  } else {
    blocks.push({ type: 'text', text: roles.map((r) => `${ROLE_LABEL[r]} **${percent(totals.get(r)!.days, allDays)}**`).join(', ') + ` of the time across ${plural(set.length, 'tender')}.` });
  }
  blocks.push({ type: 'bars', title: 'Days Held by Role', items: roles.map((r) => ({ label: ROLE_LABEL[r], value: round1(totals.get(r)!.days), display: dayText(round1(totals.get(r)!.days)) })) });
  blocks.push({
    type: 'table',
    columns: [
      { key: 'role', label: 'Role' },
      { key: 'total', label: 'Total Days', align: 'right' },
      { key: 'share', label: 'Share', align: 'right' },
      { key: 'tenders', label: 'Tenders', align: 'right' },
      { key: 'average', label: 'Avg per Tender', align: 'right' },
    ],
    rows: roles.map((r) => {
      const total = totals.get(r)!;
      return { cells: { role: ROLE_LABEL[r], total: dayText(round1(total.days)), share: percent(total.days, allDays), tenders: total.tenders.size, average: dayText(total.tenders.size ? round1(total.days / total.tenders.size) : null) } };
    }),
  });
  if (role) {
    blocks.push({
      type: 'table',
      title: `${ROLE_LABEL[role]} Officers`,
      columns: [
        { key: 'officer', label: 'Officer' },
        { key: 'stints', label: 'Times Held', align: 'right' },
        { key: 'total', label: 'Total Days', align: 'right' },
        { key: 'average', label: 'Avg Days', align: 'right' },
      ],
      rows: Array.from(perOfficer)
        .filter(([, v]) => v.role === role)
        .sort((a, b) => b[1].days / b[1].stints - a[1].days / a[1].stints)
        .map(([officer, v]) => ({ cells: { officer, stints: v.stints, total: dayText(round1(v.days)), average: dayText(round1(v.days / v.stints)) } })),
    });
  }
  return { blocks, suggestions: ['Which stage is the bottleneck?', 'Workload by officer'] };
}

function workloadAnswer(bench: Workbench, query: Query): Result {
  const { officers, holders, holderRole, groups, ...rest } = query.filters;
  const base = bench.filter(bench.data.tenders, rest);
  const named = [...(officers || []), ...(holders || [])];
  const desk = (name: string) => base.filter((t) => (isPipeline(t) && lower(t.current_holder) === lower(name)) || holdsEvaluationBidders(t, name));
  const involved = (name: string) => base.filter((t) => isTenderRelatedToUser(t, { name } as UserProfile));
  const longest = (items: Tender[]) => (items.length ? Math.max(...items.map((t) => bench.holderDays(t) || 0)) : null);

  // Time each officer kept a file before passing it on, from the movements this user may see
  const handling = new Map<string, number[]>();
  bench.filter(bench.data.auditTenders, rest).forEach((t) =>
    getEffectiveTimeline(t, bench.now).forEach((e) => {
      if (!e.exit_date || e.stage === 'Awarded' || e.stage === 'Cancelled') return;
      const key = lower(e.holder);
      handling.set(key, [...(handling.get(key) || []), getTimelineEntryDuration(e, bench.now).totalHours / 24]);
    })
  );

  if (named.length > 0) {
    const blocks: AnswerBlock[] = [];
    named.slice(0, 3).forEach((name) => {
      const user = bench.data.users.find((u) => lower(u.name) === lower(name));
      const onDesk = desk(name).sort((a, b) => (bench.holderDays(b) || 0) - (bench.holderDays(a) || 0));
      const working = involved(name);
      const stints = handling.get(lower(name)) || [];
      const who = user ? ` (${user.role}, ${user.group || '—'})` : '';
      blocks.push({
        type: 'text',
        text: onDesk.length > 0
          ? `**${name}**${who} holds **${plural(onDesk.length, 'tender')}** now, the oldest for ${dayText(longest(onDesk))}.`
          : `**${name}**${who} holds no tender now.`,
      });
      blocks.push({
        type: 'stats',
        items: [
          { label: 'On Desk', value: String(onDesk.length) },
          { label: 'Value on Desk', value: money(sumOf(onDesk, (t) => t.estimate_value_cr)) },
          { label: 'In Pipeline', value: String(working.filter(isPipeline).length) },
          { label: 'Awarded', value: String(working.filter((t) => t.brief_status === 'Awarded').length) },
          { label: 'Files Handled', value: String(stints.length) },
          { label: 'Avg Handling Time', value: dayText(averageOf(stints)) },
        ],
      });
      if (onDesk.length > 0) blocks.push(tenderTable(bench, onDesk, 'On Desk'));
      const others = working.filter((t) => isPipeline(t) && !onDesk.includes(t));
      if (others.length > 0) blocks.push(tenderTable(bench, others, 'With Others'));
    });
    return { blocks, suggestions: [`Tenders of ${named[0]}`, 'Workload by officer', 'Delayed tenders'] };
  }

  const role = query.role || holderRole;
  const rows = bench.data.users
    .filter((u) => u.role !== 'ADMIN' && (!role || u.role === role) && (!groups || groups.some((g) => lower(g) === lower(u.group))))
    .map((u) => {
      const handled = handling.get(lower(u.name)) || [];
      return { user: u, onDesk: desk(u.name), pipeline: involved(u.name).filter(isPipeline).length, handled, average: averageOf(handled) };
    })
    .filter((r) => r.onDesk.length > 0 || r.pipeline > 0 || r.handled.length > 0);

  const speed = query.officerSpeed;
  const ranked = speed
    ? rows.filter((r) => r.average !== null).sort((a, b) => (speed === 'slowest' ? b.average! - a.average! : a.average! - b.average!))
    : rows.filter((r) => r.onDesk.length > 0 || r.pipeline > 0).sort((a, b) => b.onDesk.length - a.onDesk.length || b.pipeline - a.pipeline);
  if (ranked.length === 0) return { blocks: [{ type: 'text', text: speed ? 'No file movements to analyse.' : 'No officer holds a tender.' }], suggestions: [] };

  const top = ranked[0];
  return {
    blocks: [
      {
        type: 'text',
        text: speed
          ? `**${top.user.name}** takes the ${speed === 'slowest' ? 'longest' : 'least time'} per file: **${dayText(top.average)}** on average over ${plural(top.handled.length, 'file')}.`
          : `**${top.user.name}** holds the most files: **${top.onDesk.length}** (${money(sumOf(top.onDesk, (t) => t.estimate_value_cr))}).`,
      },
      speed
        ? { type: 'bars', title: 'Avg Handling Time', items: ranked.slice(0, 12).map((r) => ({ label: r.user.name, value: r.average || 0, display: dayText(r.average) })) }
        : { type: 'bars', title: 'Files on Desk', items: ranked.filter((r) => r.onDesk.length > 0).slice(0, 12).map((r) => ({ label: r.user.name, value: r.onDesk.length, display: String(r.onDesk.length) })) },
      {
        type: 'table',
        columns: [
          { key: 'officer', label: 'Officer' },
          { key: 'role', label: 'Role' },
          { key: 'group', label: 'Group' },
          { key: 'desk', label: 'On Desk', align: 'right' },
          { key: 'value', label: 'Value on Desk', align: 'right' },
          { key: 'longest', label: 'Longest', align: 'right' },
          { key: 'pipeline', label: 'In Pipeline', align: 'right' },
          { key: 'handled', label: 'Files Handled', align: 'right' },
          { key: 'average', label: 'Avg Handling Time', align: 'right' },
        ],
        rows: ranked.map((r) => ({
          cells: {
            officer: r.user.name,
            role: r.user.role,
            group: r.user.group || '—',
            desk: r.onDesk.length,
            value: money(sumOf(r.onDesk, (t) => t.estimate_value_cr)),
            longest: dayText(longest(r.onDesk)),
            pipeline: r.pipeline,
            handled: r.handled.length,
            average: dayText(r.average),
          },
        })),
      },
    ],
    suggestions: [`Workload of ${top.user.name}`, 'Time by role', speed ? 'Workload by officer' : 'Who is the slowest officer?'],
  };
}

function evaluationAnswer(bench: Workbench, query: Query): Result {
  const { holderRole, ...rest } = query.filters;
  const atEvaluation = bench.filter(bench.data.tenders, rest).filter((t) => t.brief_status === EVALUATION_STAGE || (t.evaluation?.bidders?.length || 0) > 0);
  if (atEvaluation.length === 0) return { blocks: [{ type: 'text', text: 'No tender is at EMD / BQC evaluation.' }], suggestions: [] };
  const held = atEvaluation.filter((t) => getEvaluationHolders(t).length > 0);
  const financeOnly = (holderRole || query.role) === 'FM';
  if (financeOnly && held.length === 0) {
    return { blocks: [{ type: 'text', text: 'Finance holds no bidders now.' }], suggestions: ['EMD evaluation status'] };
  }
  const relevant = financeOnly ? held : atEvaluation;
  const withFinance = held.length;
  const cell = (t: Tender, index: number) => {
    const sub = computeEvaluationSplit(t, bench.now).subStages[index];
    const total = t.evaluation?.bidders?.length || 0;
    if (!sub || total === 0) return '—';
    if (sub.completedOn) return 'Completed';
    return `${sumOf(sub.withFinance, (f) => f.bidders.length)} of ${total} with Finance`;
  };
  return {
    blocks: [
      { type: 'text', text: `**${plural(relevant.length, 'tender')}** at EMD / BQC evaluation; Finance holds bidders in **${withFinance}**.` },
      {
        type: 'table',
        columns: [
          { key: 'pr', label: 'PR No', mono: true },
          { key: 'item', label: 'Item Description' },
          { key: 'bidders', label: 'Bidders', align: 'right' },
          { key: 'emd', label: 'EMD Evaluation' },
          { key: 'bqc', label: 'BQC Evaluation' },
          { key: 'finance', label: 'Finance Officers' },
        ],
        rows: relevant.map((t) => ({
          srNo: t.sr_no,
          cells: { pr: t.pr_no, item: t.item_description, bidders: t.evaluation?.bidders?.length || 0, emd: cell(t, 0), bqc: cell(t, 1), finance: getEvaluationHolders(t).join(', ') || '—' },
        })),
      },
    ],
    suggestions: relevant.slice(0, 2).map((t) => `Bidders of ${t.pr_no}`),
  };
}

function compareAnswer(bench: Workbench, query: Query): Result {
  const { kind, values } = query.compare!;
  const subsets = values.map((value) => {
    const filters: Filters = { ...query.filters };
    if (kind === 'group') filters.groups = [value];
    if (kind === 'officer') filters.officers = [value];
    if (kind === 'stage') filters.stages = [value];
    if (kind === 'type') filters.types = [value];
    return { value, set: bench.filter(bench.data.tenders, filters) };
  });
  const metrics = subsets.map(({ value, set }) => {
    const pipeline = set.filter(isPipeline);
    const awarded = set.filter((t) => t.brief_status === 'Awarded');
    return {
      value,
      set,
      cells: {
        name: value,
        count: set.length,
        pipeline: pipeline.length,
        awarded: awarded.length,
        cancelled: set.filter((t) => t.brief_status === 'Cancelled').length,
        pipelineValue: money(sumOf(pipeline, (t) => t.estimate_value_cr)),
        awardedValue: money(sumOf(awarded, (t) => t.awarded_value_cr)),
        savings: money(sumOf(awarded, (t) => t.savings_due_to_negotiation_cr)),
        sla: dayText(averageOf(awarded.map((t) => bench.totalDays(t) || 0))),
        delayed: pipeline.filter((t) => bench.isDelayed(t)).length,
      },
    };
  });
  return {
    blocks: [
      { type: 'text', text: metrics.map((m) => `**${m.value}**: ${plural(m.set.length, 'tender')}, ${money(sumOf(m.set, (t) => t.estimate_value_cr))}`).join(' · ') },
      { type: 'bars', title: 'Tenders', items: metrics.map((m) => ({ label: m.value, value: m.set.length, display: String(m.set.length) })) },
      {
        type: 'table',
        columns: [
          { key: 'name', label: { group: 'Group', officer: 'Officer', stage: 'Stage', type: 'Type' }[kind] },
          { key: 'count', label: 'Tenders', align: 'right' },
          { key: 'pipeline', label: 'In Pipeline', align: 'right' },
          { key: 'awarded', label: 'Awarded', align: 'right' },
          { key: 'cancelled', label: 'Cancelled', align: 'right' },
          { key: 'pipelineValue', label: 'Pipeline Value', align: 'right' },
          { key: 'awardedValue', label: 'Awarded Value', align: 'right' },
          { key: 'savings', label: 'Savings', align: 'right' },
          { key: 'sla', label: 'Avg SLA', align: 'right' },
          { key: 'delayed', label: 'Delayed', align: 'right' },
        ],
        rows: metrics.map((m) => ({ cells: m.cells })),
      },
    ],
    suggestions: values.map((v) => (kind === 'group' ? `Summary of ${v}` : kind === 'officer' ? `Workload of ${v}` : kind === 'stage' ? `Tenders at ${v}` : `${v} tenders`)),
  };
}

function peopleAnswer(bench: Workbench, query: Query, question: string): Result {
  const { leadership, groups, users } = bench.data;
  const asked = /finance head/i.test(question)
    ? `Finance Head: **${leadership.financeHeadName || '—'}**`
    : /estimat\w* head/i.test(question)
    ? `Estimate Head: **${leadership.estimateHeadName || '—'}**`
    : /entity head|\bcpo\b/i.test(question)
    ? `Entity Head: **${leadership.entityHeadName || '—'}**`
    : null;
  const wanted = query.filters.groups;
  if (wanted && wanted.length > 0) {
    const blocks: AnswerBlock[] = [];
    wanted.forEach((name) => {
      const group = groups.find((g) => lower(g.name) === lower(name));
      const members = users.filter((u) => lower(u.group) === lower(name));
      const leaders = group?.leaderNames?.length ? group.leaderNames : group?.leaderName ? [group.leaderName] : [];
      blocks.push({ type: 'text', text: `**${name}**: ${leaders.length ? `led by **${leaders.join(', ')}**, ` : ''}${plural(members.length, 'officer')}.` });
      blocks.push({
        type: 'table',
        columns: [
          { key: 'officer', label: 'Officer' },
          { key: 'role', label: 'Role' },
          { key: 'designation', label: 'Designation' },
        ],
        rows: members.map((u) => ({ cells: { officer: u.name, role: u.role, designation: u.designation || '—' } })),
      });
    });
    return { blocks, suggestions: wanted.map((g) => `Summary of ${g}`) };
  }
  return {
    blocks: [
      ...(asked ? [{ type: 'text', text: asked } as AnswerBlock] : []),
      {
        type: 'stats',
        items: [
          { label: 'Entity Head', value: leadership.entityHeadName || '—' },
          { label: 'Finance Head', value: leadership.financeHeadName || '—' },
          { label: 'Estimate Head', value: leadership.estimateHeadName || '—' },
        ],
      },
      {
        type: 'table',
        title: 'Group Leaders',
        columns: [
          { key: 'group', label: 'Group' },
          { key: 'leader', label: 'Leader' },
          { key: 'officers', label: 'Officers', align: 'right' },
        ],
        rows: groups.map((g) => ({
          cells: { group: g.name, leader: (g.leaderNames?.length ? g.leaderNames : [g.leaderName]).filter(Boolean).join(', ') || '—', officers: users.filter((u) => lower(u.group) === lower(g.name)).length },
        })),
      },
    ],
    suggestions: ['Workload by officer'],
  };
}

function holidaysAnswer(bench: Workbench, query: Query): Result {
  const all = [...(bench.data.slaRules.holidays || [])].sort((a, b) => a.date.localeCompare(b.date));
  const toDate = (iso: string) => {
    const [y, mo, d] = iso.split('-').map(Number);
    return new Date(y, mo - 1, d);
  };
  const today = new Date(bench.now.getFullYear(), bench.now.getMonth(), bench.now.getDate()).getTime();
  const range = query.filters.date;
  const shown = range ? all.filter((h) => toDate(h.date).getTime() >= range.from && toDate(h.date).getTime() < range.to) : all.filter((h) => toDate(h.date).getTime() >= today).slice(0, 10);
  if (shown.length === 0) return { blocks: [{ type: 'text', text: range ? `No holidays in ${range.label}.` : 'No upcoming holidays in the list.' }], suggestions: [] };
  const next = shown[0];
  return {
    blocks: [
      { type: 'text', text: range ? `**${plural(shown.length, 'holiday')}** in ${range.label}.` : `Next holiday: **${next.name}** on ${dateText(toDate(next.date))} (${WEEKDAYS[toDate(next.date).getDay()]}).` },
      {
        type: 'table',
        columns: [
          { key: 'date', label: 'Date', mono: true },
          { key: 'day', label: 'Day' },
          { key: 'name', label: 'Holiday' },
        ],
        rows: shown.map((h) => ({ cells: { date: dateText(toDate(h.date)), day: WEEKDAYS[toDate(h.date).getDay()], name: h.name } })),
      },
    ],
    suggestions: [],
  };
}

function tasksAnswer(bench: Workbench): Result {
  const mine = bench.data.tasks.filter((task) => lower(task.assigned_to) === lower(bench.data.currentUser.name));
  const open = mine.filter((task) => !task.completed);
  if (mine.length === 0) return { blocks: [{ type: 'text', text: 'No tasks.' }], suggestions: [] };
  return {
    blocks: [
      { type: 'text', text: `**${plural(open.length, 'open task')}**, ${mine.length - open.length} done.` },
      {
        type: 'table',
        columns: [
          { key: 'title', label: 'Task' },
          { key: 'due', label: 'Due', mono: true },
          { key: 'tender', label: 'Tender', mono: true },
          { key: 'status', label: 'Status' },
        ],
        rows: [...open, ...mine.filter((task) => task.completed)].map((task) => ({
          srNo: bench.data.tenders.find((t) => t.pr_no === task.linked_tender_pr)?.sr_no,
          cells: { title: task.title, due: task.due_date || '—', tender: task.linked_tender_pr || '—', status: task.completed ? 'Done' : 'Open' },
        })),
      },
    ],
    suggestions: ['My pending tenders'],
  };
}

/** Answers one question. `previous` is the filter set of the answer before, for follow-up questions. */
export function ask(question: string, data: AssistantData, previous?: Filters, now: Date = new Date()): Answer {
  const query = parseQuestion(question, data, !!previous, now);
  if (query.refine && previous) query.filters = { ...previous, ...query.filters };
  const bench = new Workbench(data, now);
  const chips = chipsFor(query.filters);
  const done = (result: Result, withChips = true): Answer => ({ chips: withChips ? chips : [], blocks: result.blocks, suggestions: result.suggestions, filters: query.filters });

  // One word that fits several officers: ask which one
  if (query.ambiguous && !query.filters.officers && !query.filters.holders && query.tenderRefs.length === 0) {
    const { word, options } = query.ambiguous;
    return done(
      {
        blocks: [{ type: 'text', text: `Which **${word}**?` }],
        suggestions: options.map((name) => question.replace(new RegExp(`\\b${word}\\b`, 'i'), name)),
      },
      false
    );
  }

  switch (query.intent) {
    case 'help':
      return done({ blocks: [{ type: 'text', text: 'Examples' }], suggestions: examples(data) }, false);
    case 'thanks':
      return { chips: [], blocks: [{ type: 'text', text: 'OK.' }], suggestions: [], filters: previous || {} };

    case 'tender': {
      const found = query.tenderRefs.map((srNo) => data.tenders.find((t) => t.sr_no === srNo)).filter((t): t is Tender => !!t);
      if (found.length === 0) return done({ blocks: [{ type: 'text', text: `No tender matches **${query.missingRef}**.` }], suggestions: ['All tenders'] }, false);
      if (found.length === 1) return done(tenderAnswer(bench, found[0], query.tenderFocus, undefined, query.tenderDate), false);
      return done({ blocks: [{ type: 'text', text: `**${plural(found.length, 'tender')}**` }, tenderTable(bench, found)], suggestions: [] }, false);
    }

    case 'compare':
      return done(compareAnswer(bench, query));
    case 'people':
      return done(peopleAnswer(bench, query, question), false);
    case 'holidays':
      return done(holidaysAnswer(bench, query), false);
    case 'tasks':
      return done(tasksAnswer(bench), false);
    case 'bottleneck':
      return done(bottleneckAnswer(bench, query));
    case 'roleTime':
      return done(roleTimeAnswer(bench, query));
    case 'workload':
      return done(workloadAnswer(bench, query));
    case 'evaluation':
      return done(evaluationAnswer(bench, query));
  }

  const set = bench.filter(data.tenders, query.filters);

  switch (query.intent) {
    case 'summary':
      if (set.length === 0) break;
      return done(summaryAnswer(bench, set));
    case 'cancelReasons': {
      const cancelled = bench.filter(data.tenders, { ...query.filters, status: 'cancelled' });
      if (cancelled.length === 0) return done({ blocks: [{ type: 'text', text: 'No cancelled tenders.' }], suggestions: [] });
      return done({
        blocks: [{ type: 'text', text: `**${plural(cancelled.length, 'cancelled tender')}** · ${money(sumOf(cancelled, (t) => t.estimate_value_cr))}` }, tenderTable(bench, cancelled)],
        suggestions: ['Cancelled tenders by stage'],
      });
    }
    case 'postAward': {
      if (set.length === 0) break;
      return done({
        blocks: [
          { type: 'text', text: `**${plural(set.length, 'awarded tender')}** with post-award work open.` },
          tenderTable(bench, set, undefined, {
            column: { key: 'steps', label: 'Steps Done', align: 'right' },
            cell: (t) => `${(t.post_award_steps || []).filter((s) => s.completed).length} / ${(t.post_award_steps || []).length}`,
          }),
        ],
        suggestions: [],
      });
    }
    case 'breakdown':
      if (set.length === 0) break;
      return done(breakdownAnswer(bench, query, set));
    case 'top':
      if (set.length === 0) break;
      return done(topAnswer(bench, query, set));
    case 'list':
    case 'count':
    case 'total':
    case 'average':
      if (set.length === 0) break;
      if (query.intent === 'list' && set.length === 1) return done(tenderAnswer(bench, set[0], query.tenderFocus));
      return done(listAnswer(bench, query, set));
    case 'unknown': {
      const blocks: AnswerBlock[] = [{ type: 'text', text: 'I did not understand that.' }];
      return done({ blocks, suggestions: examples(data) }, false);
    }
  }

  // A recognised question with nothing to show
  return done({ blocks: [{ type: 'text', text: 'No tenders match.' }], suggestions: chips.length > 1 ? ['All tenders', 'Summary'] : ['Summary'] });
}
