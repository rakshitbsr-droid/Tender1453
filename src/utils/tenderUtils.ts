import { Tender, TenderStage, UserRole, UserProfile, TimelineLogEntry } from '../types';
import { USERS } from '../data/seedData';

export const GROUPS = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6'] as const;
export type GroupName = (typeof GROUPS)[number];

export function getOfficerGroup(officerName: string): string {
  const user = USERS.find((u) => u.name === officerName);
  if (user && user.group) return user.group;
  return 'Group 1';
}

export function getOfficersInGroup(groupName: string): UserProfile[] {
  return USERS.filter((u) => u.group === groupName && u.role !== 'ADMIN');
}

export function isWorkingTender(tender: Tender): boolean {
  return tender.brief_status !== 'Awarded' && tender.brief_status !== 'Cancelled';
}

export function getOfficerWorkingTenders(officerName: string, tenders: Tender[]): {
  activeWorkingTenders: Tender[];
  currentlyHoldingTenders: Tender[];
  totalWorkingCount: number;
  totalWorkingValueCr: number;
} {
  const activeWorkingTenders = tenders.filter(
    (t) =>
      isWorkingTender(t) &&
      (t.pm_officer === officerName ||
        t.attached_pms?.includes(officerName) ||
        t.attached_fms?.includes(officerName) ||
        t.attached_cec_officers?.includes(officerName) ||
        t.current_holder === officerName ||
        t.timeline?.some((l) => l.holder === officerName))
  );

  const currentlyHoldingTenders = tenders.filter(
    (t) => isWorkingTender(t) && t.current_holder === officerName
  );

  const totalWorkingValueCr = activeWorkingTenders.reduce(
    (sum, t) => sum + (t.estimate_value_cr || 0),
    0
  );

  return {
    activeWorkingTenders,
    currentlyHoldingTenders,
    totalWorkingCount: activeWorkingTenders.length,
    totalWorkingValueCr: +totalWorkingValueCr.toFixed(2),
  };
}

export function formatCurrencyCr(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('en-IN');
}

export const STAGE_STEPS: TenderStage[] = [
  'PR Received',
  'Under Estimation',
  'BQC Preparation',
  'To be Floated',
  'Under Bidding',
  'Under BQC / Tech Evaluation',
  'Under Award TEC',
  'Under Negotiation',
  'Awarded',
];

/** The exact 9 canonical procurement workflow stages */
export const NINE_STANDARD_STAGES: TenderStage[] = STAGE_STEPS;

/**
 * Normalizes any historical or raw timeline stage string into one of the 9 canonical stages.
 * Specifically ensures:
 * 1. "Finance review for BQC" is mapped strictly under "BQC Preparation".
 * 2. "Finance Concurrence" during evaluation is mapped under "Under BQC / Tech Evaluation".
 */
export function normalizeToNineStages(rawStage: string | null | undefined): TenderStage {
  if (!rawStage) return 'PR Received';
  const s = rawStage.trim().toLowerCase();

  if (s.includes('pr received') || s.includes('pr verification') || s.includes('indent')) {
    return 'PR Received';
  }
  if (s.includes('estimation') || s.includes('benchmark') || s.includes('cec')) {
    return 'Under Estimation';
  }
  // Finance review for BQC will be under BQC only
  if (
    s.includes('bqc preparation') ||
    s.includes('finance review of bqc') ||
    s.includes('finance review for bqc') ||
    s.includes('review of bqc') ||
    s === 'bqc'
  ) {
    return 'BQC Preparation';
  }
  if (s.includes('to be floated') || s.includes('floated') || s.includes('publishing') || s.includes('nit')) {
    return 'To be Floated';
  }
  if (s.includes('bidding') || s.includes('pre-bid')) {
    return 'Under Bidding';
  }
  // Evaluation stage (including Finance Concurrence during technical/commercial evaluation)
  if (
    s.includes('bqc / tech') ||
    s.includes('tech evaluation') ||
    s.includes('technical evaluation') ||
    s.includes('finance concurrence')
  ) {
    return 'Under BQC / Tech Evaluation';
  }
  if (s.includes('award tec') || s.includes('tec preparation') || s.includes('tec proposed')) {
    return 'Under Award TEC';
  }
  if (s.includes('negotiation')) {
    return 'Under Negotiation';
  }
  if (s.includes('awarded') || s.includes('committee') || s.includes('sanction') || s.includes('aoc')) {
    return 'Awarded';
  }

  return 'PR Received';
}

export function getStageStepIndex(stage: TenderStage): number {
  return STAGE_STEPS.indexOf(stage);
}

export function getStageBadgeColor(stage: TenderStage): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (stage) {
    case 'PR Received':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    case 'Under Estimation':
      return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
    case 'BQC Preparation':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'To be Floated':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    case 'Under Bidding':
      return { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' };
    case 'Under BQC / Tech Evaluation':
      return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' };
    case 'Under Award TEC':
      return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' };
    case 'Under Negotiation':
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
    case 'Awarded':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'Cancelled':
      return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
    case 'Under Discussion with User':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
  }
}

export function getRoleBadge(role: UserRole | ''): { label: string; bg: string; text: string; border: string } {
  switch (role) {
    case 'PM':
      return { label: 'Procurement (PM)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'FM':
      return { label: 'Finance (FM)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'CEC':
      return { label: 'Estimation (CEC)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'ADMIN':
      return { label: 'Management', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    default:
      return { label: 'None', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

/** Team names in plain words. The UI should show these instead of the bare codes PM / FM / CEC. */
export const ROLE_NAMES: Record<string, string> = {
  PM: 'Procurement',
  FM: 'Finance',
  CEC: 'Estimation',
  ADMIN: 'Management',
};

export function roleName(role: UserRole | string | null | undefined): string {
  if (!role) return '—';
  return ROLE_NAMES[role] ?? role;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Display-only date: '18-08-2024' -> '18 Aug 2024', '25-11-2024 10:00' -> '25 Nov 2024, 10:00'.
 * Never wraps mid-date when rendered with whitespace-nowrap. Stored values keep the DD-MM-YYYY format.
 */
export function formatFriendlyDate(dateStr: string | null | undefined, fallback: string = '—'): string {
  if (!dateStr || !dateStr.trim()) return fallback;
  const d = parseCustomDate(dateStr);
  if (!d) return dateStr;
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hasTime = dateStr.includes(':');
  if (!hasTime) return date;
  return `${date}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Short human duration from a day count: 0.25 -> '6 hrs', 1 -> '1 day', 12.4 -> '12 days'. */
export function formatDaysShort(days: number | null | undefined): string {
  if (days === null || days === undefined || isNaN(days)) return '—';
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }
  const rounded = Math.round(days);
  return rounded === 1 ? '1 day' : `${rounded} days`;
}

/**
 * Parses dates formatted as 'DD-MM-YYYY', 'DD-MM-YYYY HH:mm', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm', or ISO format.
 */
export function parseCustomDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // If already standard ISO or has T
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // Format DD-MM-YYYY HH:mm or DD-MM-YYYY
  const parts = s.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '09:00';

  if (datePart.includes('-')) {
    const dateComponents = datePart.split('-');
    if (dateComponents.length === 3) {
      // Check if YYYY-MM-DD
      if (dateComponents[0].length === 4) {
        const year = parseInt(dateComponents[0], 10);
        const month = parseInt(dateComponents[1], 10) - 1;
        const day = parseInt(dateComponents[2], 10);
        const [hh, mm] = (timePart || '00:00').split(':').map((v) => parseInt(v, 10) || 0);
        const d = new Date(year, month, day, hh, mm);
        if (!isNaN(d.getTime())) return d;
      } else {
        // DD-MM-YYYY
        const day = parseInt(dateComponents[0], 10);
        const month = parseInt(dateComponents[1], 10) - 1;
        const year = parseInt(dateComponents[2], 10);
        const [hh, mm] = (timePart || '00:00').split(':').map((v) => parseInt(v, 10) || 0);
        const d = new Date(year, month, day, hh, mm);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Milliseconds between two moments that fall on working days (Monday to Friday).
 * Saturdays and Sundays are skipped entirely, so Friday 09:00 -> Monday 09:00 is exactly one day.
 */
export function workingMsBetween(start: Date, end: Date): number {
  let total = 0;
  let cursor = start;
  while (cursor < end) {
    const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const sliceEnd = nextMidnight < end ? nextMidnight : end;
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) total += sliceEnd.getTime() - cursor.getTime();
    cursor = sliceEnd;
  }
  return total;
}

/**
 * Calculates elapsed working days (Mon-Fri, rounded to 1 decimal place) between two date strings.
 * Minimum is 0.
 */
export function calculateElapsedDays(startStr: string | null | undefined, endStr: string | null | undefined): number {
  const start = parseCustomDate(startStr);
  const end = parseCustomDate(endStr);
  if (!start || !end) return 0;
  const diffMs = workingMsBetween(start, end);
  if (diffMs <= 0) return 0;
  const days = diffMs / (1000 * 60 * 60 * 24);
  return Math.round(days * 10) / 10;
}

/**
 * Calculates elapsed working hours (Mon-Fri, rounded to 1 decimal place) between two date/datetime strings.
 * Minimum is 0.
 */
export function calculateElapsedHours(
  startStr: string | null | undefined,
  endStr: string | null | undefined
): number {
  const start = parseCustomDate(startStr);
  const end = parseCustomDate(endStr);
  if (!start || !end) return 0;
  const diffMs = workingMsBetween(start, end);
  if (diffMs <= 0) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}

export interface EntryDurationResult {
  totalHours: number;
  totalDays: number;
  days: number;
  remainingHours: number;
  formattedDisplay: string;
  compactDisplay: string;
  isQuickTurnaround: boolean; // < 24 hours
  isOngoing: boolean;
}

/**
 * Resolves exact hours and days spent for a timeline entry.
 * Accounts for:
 * 1. Explicit hours_spent if provided.
 * 2. Working-time difference (Mon-Fri, including hours/minutes) when start and end contain time.
 * 3. Fractional days_spent (e.g. 0.25 day = 6 hours, 0.5 day = 12 hours).
 * 4. Ongoing active status if exit_date is null.
 */
export function getTimelineEntryDuration(
  entry: TimelineLogEntry,
  referenceDate?: Date
): EntryDurationResult {
  let totalHours = 0;
  const isOngoing = !entry.exit_date;

  if (entry.hours_spent !== undefined && entry.hours_spent !== null && entry.hours_spent >= 0) {
    totalHours = entry.hours_spent;
  } else {
    const start = parseCustomDate(entry.entry_date);
    const end = isOngoing ? referenceDate || new Date() : parseCustomDate(entry.exit_date);

    const hasExplicitTime =
      (entry.entry_date && entry.entry_date.includes(':')) ||
      (entry.exit_date && entry.exit_date.includes(':'));

    if (hasExplicitTime && start && end) {
      const diffMs = workingMsBetween(start, end);
      totalHours = Math.max(0.1, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    } else if (entry.days_spent !== null && entry.days_spent !== undefined) {
      totalHours = Math.round(entry.days_spent * 24 * 10) / 10;
    } else if (start && end) {
      const diffMs = workingMsBetween(start, end);
      totalHours = Math.max(1, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    } else {
      totalHours = 24; // fallback 1 day
    }
  }

  // Ensure minimum for ongoing active entries
  if (isOngoing && totalHours <= 0) {
    totalHours = 1;
  }

  const totalDays = Math.round((totalHours / 24) * 10) / 10;
  const days = Math.floor(totalHours / 24);
  const remainingHours = Math.round((totalHours % 24) * 10) / 10;
  const isQuickTurnaround = totalHours < 24;

  let formattedDisplay = '';
  let compactDisplay = '';

  if (totalHours < 1) {
    const mins = Math.max(1, Math.round(totalHours * 60));
    formattedDisplay = `${mins} mins`;
    compactDisplay = `${mins}m`;
  } else if (totalHours < 24) {
    const hrsStr = totalHours % 1 === 0 ? `${totalHours}` : `${totalHours.toFixed(1)}`;
    formattedDisplay = `${hrsStr} hrs`;
    compactDisplay = `${hrsStr}h`;
  } else {
    const daysStr = days === 1 ? '1 day' : `${days} days`;
    if (remainingHours === 0) {
      formattedDisplay = `${daysStr} (${Math.round(totalHours)} hrs)`;
      compactDisplay = `${days}d`;
    } else {
      formattedDisplay = `${days}d ${remainingHours}h (${Math.round(totalHours)} hrs)`;
      compactDisplay = `${days}d ${remainingHours}h`;
    }
  }

  return {
    totalHours,
    totalDays,
    days,
    remainingHours,
    formattedDisplay,
    compactDisplay,
    isQuickTurnaround,
    isOngoing,
  };
}

/**
 * Formats duration in hours/days according to specified preference
 */
export function formatDurationWithUnit(
  totalHours: number,
  unitMode: 'both' | 'hours' | 'days' = 'both'
): string {
  if (unitMode === 'hours') {
    const h = Math.round(totalHours * 10) / 10;
    return `${h % 1 === 0 ? h : h.toFixed(1)} hrs`;
  }
  if (unitMode === 'days') {
    const d = Math.round((totalHours / 24) * 10) / 10;
    return `${d % 1 === 0 ? d : d.toFixed(1)} days`;
  }
  if (totalHours < 1) {
    return `${Math.max(1, Math.round(totalHours * 60))} mins`;
  }
  if (totalHours < 24) {
    const h = Math.round(totalHours * 10) / 10;
    return `${h % 1 === 0 ? h : h.toFixed(1)} hrs`;
  }
  const days = Math.floor(totalHours / 24);
  const rem = Math.round((totalHours % 24) * 10) / 10;
  if (rem === 0) {
    return `${days}d (${Math.round(totalHours)}h)`;
  }
  return `${days}d ${rem}h (${Math.round(totalHours)}h)`;
}

/**
 * Format a Date or date string to 'DD-MM-YYYY HH:mm'
 */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dateObj = typeof d === 'string' ? parseCustomDate(d) : d;
  if (!dateObj || isNaN(dateObj.getTime())) return typeof d === 'string' ? d : '—';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${mins}`;
}

/**
 * Format a Date to 'YYYY-MM-DDTHH:mm' for datetime-local inputs
 */
export function toDateTimeLocalInput(d: Date | string | null | undefined): string {
  const dateObj = typeof d === 'string' ? parseCustomDate(d) || new Date() : d || new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function getTenderCurrentStageDays(tender: Tender): number {
  if (tender.timeline && tender.timeline.length > 0) {
    const lastEntry = tender.timeline[tender.timeline.length - 1];
    if (lastEntry.days_spent !== null) {
      return lastEntry.days_spent;
    }
    // Calculate working days between entry_date and current time
    if (lastEntry.entry_date) {
      const entryDate = parseCustomDate(lastEntry.entry_date);
      if (entryDate) {
        const diffMs = workingMsBetween(entryDate, new Date());
        const days = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10);
        return days;
      }
    }
    return 1;
  }
  return 0;
}

export function exportTendersToCSV(tenders: Tender[], filename: string = 'CPO_Tender_Register_Export.csv') {
  const headers = [
    'Sr No',
    'PR No / Reference',
    'CRFQ No',
    'Item Description',
    'User Function',
    'Procuring Officer (PM)',
    'Attached PMs',
    'Tender Type',
    'Estimate Value (Cr)',
    'Awarded Value (Cr)',
    'Savings (Cr)',
    'Status',
    'Current Holder',
    'Current Pillar',
    'SLA (Days)',
    'Tender Floated On',
    'TEC Proposed On',
    'TEC Approval Date',
    'Time by Committee (Days)',
    'Attached FM(s)',
    'Attached CEC Officer(s)',
    'Remarks',
  ];

  const rows = tenders.map((t) => [
    t.sr_no,
    `"${t.pr_no}"`,
    `"${t.crfq_no || ''}"`,
    `"${t.item_description.replace(/"/g, '""')}"`,
    `"${t.user_function}"`,
    `"${t.pm_officer}"`,
    `"${(t.attached_pms || []).join('; ')}"`,
    `"${t.tender_type}"`,
    t.estimate_value_cr,
    t.awarded_value_cr ?? '',
    t.savings_due_to_negotiation_cr ?? '',
    `"${t.brief_status}"`,
    `"${t.current_holder || '—'}"`,
    `"${t.current_role || '—'}"`,
    t.sla_days ?? '',
    `"${t.tender_floated_on || ''}"`,
    `"${t.tec_proposed_on || ''}"`,
    `"${t.tec_approval_date || ''}"`,
    t.time_taken_approving_committee_days ?? '',
    `"${(t.attached_fms || []).join('; ')}"`,
    `"${(t.attached_cec_officers || []).join('; ')}"`,
    `"${(t.remarks || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Checks whether an officer is the PRIMARY officer for a tender based on their role:
 * - For PM: tender.pm_officer (Primary PM)
 * - For FM: tender.attached_fms?.[0] (Lead / Primary FM)
 * - For CEC: tender.attached_cec_officers?.[0] (Lead / Primary CEC)
 *
 * If role is not specified, returns true if the officer is primary in ANY of the above categories.
 * Tenders where the officer is only secondary (attached_pms, attached_fms[1..], attached_cec_officers[1..]) return false.
 */
export function isPrimaryOfficer(tender: Tender, officerName: string, role?: UserRole): boolean {
  if (!officerName) return false;
  const nameLower = officerName.trim().toLowerCase();

  // If role is PM: must be primary PM
  if (role === 'PM') {
    return tender.pm_officer?.trim().toLowerCase() === nameLower;
  }

  // If role is FM: must be lead / primary FM (first in attached_fms)
  if (role === 'FM') {
    return tender.attached_fms?.[0]?.trim().toLowerCase() === nameLower;
  }

  // If role is CEC: must be lead / primary CEC (first in attached_cec_officers)
  if (role === 'CEC') {
    return tender.attached_cec_officers?.[0]?.trim().toLowerCase() === nameLower;
  }

  // General check across all roles:
  const isPrimaryPm = tender.pm_officer?.trim().toLowerCase() === nameLower;
  const isPrimaryFm = tender.attached_fms?.[0]?.trim().toLowerCase() === nameLower;
  const isPrimaryCec = tender.attached_cec_officers?.[0]?.trim().toLowerCase() === nameLower;

  return isPrimaryPm || isPrimaryFm || isPrimaryCec;
}

/**
 * Checks whether an officer is ONLY a secondary officer for a tender:
 * - secondary PM: in attached_pms, but NOT pm_officer
 * - secondary FM: in attached_fms from index 1 onwards, but NOT attached_fms[0]
 * - secondary CEC: in attached_cec_officers from index 1 onwards, but NOT attached_cec_officers[0]
 */
export function isSecondaryOfficer(tender: Tender, officerName: string, role?: UserRole): boolean {
  if (!officerName) return false;
  const nameLower = officerName.trim().toLowerCase();

  // If already primary, then not strictly secondary-only
  if (isPrimaryOfficer(tender, officerName, role)) {
    return false;
  }

  if (role === 'PM') {
    return !!tender.attached_pms?.some((pm) => pm.trim().toLowerCase() === nameLower);
  }

  if (role === 'FM') {
    return !!tender.attached_fms?.slice(1).some((fm) => fm.trim().toLowerCase() === nameLower);
  }

  if (role === 'CEC') {
    return !!tender.attached_cec_officers?.slice(1).some((c) => c.trim().toLowerCase() === nameLower);
  }

  const isSecPm = !!tender.attached_pms?.some((pm) => pm.trim().toLowerCase() === nameLower);
  const isSecFm = !!tender.attached_fms?.slice(1).some((fm) => fm.trim().toLowerCase() === nameLower);
  const isSecCec = !!tender.attached_cec_officers?.slice(1).some((c) => c.trim().toLowerCase() === nameLower);

  return isSecPm || isSecFm || isSecCec;
}

/**
 * Returns the primary officer role label for a tender and officer:
 * 'Primary PM' | 'Lead FM' | 'Primary CEC' | null
 */
export function getPrimaryRoleLabel(tender: Tender, officerName: string): string | null {
  if (!officerName) return null;
  const nameLower = officerName.trim().toLowerCase();

  if (tender.pm_officer?.trim().toLowerCase() === nameLower) {
    return 'Primary PM';
  }
  if (tender.attached_fms?.[0]?.trim().toLowerCase() === nameLower) {
    return 'Lead FM';
  }
  if (tender.attached_cec_officers?.[0]?.trim().toLowerCase() === nameLower) {
    return 'Primary CEC';
  }
  return null;
}
