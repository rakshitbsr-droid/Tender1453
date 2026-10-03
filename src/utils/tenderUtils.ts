import {
  Tender,
  TenderStage,
  UserRole,
  UserProfile,
  TimelineLogEntry,
  StageMasterItem,
  SlaMasterRules,
  PublicHolidayItem,
  GroupMasterItem,
  EntityLeadershipSettings,
  UserFunctionMasterItem,
  TenderTypeMasterItem,
  EvaluationSubStage,
  EvaluationMovement,
} from '../types';
import { USERS } from '../data/seedData';

export const GROUPS = [
  'Group 1',
  'Group 2',
  'Group 3',
  'Group 4',
  'Group 5',
  'Group 6',
  'Finance Group',
  'Estimation Group',
] as const;
export type GroupName = (typeof GROUPS)[number];

export const DEFAULT_USER_FUNCTIONS: UserFunctionMasterItem[] = [
  { id: 'uf-1', name: 'E&P-Services', department: 'Exploration & Production', description: 'Upstream exploration, drilling, rig management and subsea services' },
  { id: 'uf-2', name: 'E&P-Bargarh', department: 'Exploration & Production', description: 'Bargarh onshore development, wells & surface facilities' },
  { id: 'uf-3', name: 'Brand', department: 'Marketing & Corporate Communications', description: 'Brand management, institutional advertising and corporate media' },
  { id: 'uf-4', name: 'RE', department: 'Renewable Energy', description: 'Solar, wind, hybrid energy projects and green hydrogen' },
  { id: 'uf-5', name: 'SOR', department: 'Schedule of Rates', description: 'Standard Schedule of Rates contracts and recurring rate fixtures' },
  { id: 'uf-6', name: 'HSSE', department: 'Safety & Environment', description: 'Health, Safety, Security, Firefighting & Environmental compliance' },
  { id: 'uf-7', name: 'Alpha Services', department: 'Operations', description: 'Operations & continuous maintenance support services' },
  { id: 'uf-8', name: 'Beta Operations', department: 'Plant Operations', description: 'Process plant operations and chemical refining units' },
  { id: 'uf-9', name: 'Gamma Retail', department: 'Retail Operations', description: 'Retail fuel outlets, automated dispensing and EV charging stations' },
  { id: 'uf-10', name: 'Delta Logistics', department: 'Supply Chain', description: 'Marine transport, pipeline logistics, rail and road fleet contracts' },
  { id: 'uf-11', name: 'Epsilon Safety', department: 'Asset Protection', description: 'Critical asset security, surveillance and safety inspections' },
  { id: 'uf-12', name: 'Zeta Digital', department: 'Information Technology', description: 'SCADA, ERP, digital engineering and cybersecurity infrastructure' },
];

export const DEFAULT_TENDER_TYPES: TenderTypeMasterItem[] = [
  { id: 'tt-1', name: 'Open', description: 'Public open competitive bidding advertised nationally/internationally via e-procurement portal' },
  { id: 'tt-2', name: 'Limited', description: 'Limited tender floated strictly to pre-qualified or empaneled vendors' },
  { id: 'tt-3', name: 'Single', description: 'Single tender issued on proprietary justification or emergency grounds with competent authority approval' },
  { id: 'tt-4', name: 'OEM', description: 'Original Equipment Manufacturer spares, proprietary service licenses and OEM equipment packages' },
  { id: 'tt-5', name: 'SOR', description: 'Schedule of Rates tender for recurring works, civil jobs and routine operational services' },
  { id: 'tt-6', name: 'QCBS', description: 'Quality and Cost Based Selection with combined technical and financial weightage' },
  { id: 'tt-7', name: 'Proprietary', description: 'Specialized technology proprietary procurement from recognized patent holder' },
  { id: 'tt-8', name: 'Global / ICB', description: 'International Competitive Bidding for large capital packages requiring global participation' },
];

export const DEFAULT_GROUPS: GroupMasterItem[] = [
  {
    id: 'grp-1',
    name: 'Group 1',
    type: 'Procurement',
    leaderName: 'Amit Kumar Jha',
    leaderNames: ['Amit Kumar Jha'],
    officerNames: ['Amit Kumar Jha', 'Ashishkumar Mihirkumar Jha', 'Gunjan Omprakash Bhiwal', 'Suryawanshi Tulsidas'],
    financeOfficerNames: ['Rajesh J', 'Priya Nair'],
    estimateOfficerNames: ['Meera Iyer', 'Arjun Patel'],
    description: 'Procurement Group 1 (Refining, E&P Services & Turnarounds)',
  },
  {
    id: 'grp-2',
    name: 'Group 2',
    type: 'Procurement',
    leaderName: 'Purushottam Kumar',
    leaderNames: ['Purushottam Kumar'],
    officerNames: ['Purushottam Kumar', 'Praveen Kumar Sharma', 'Manoj Kumar', 'Rajanikanth P'],
    financeOfficerNames: ['Rajesh J', 'Ananya Verma'],
    estimateOfficerNames: ['Rohan Sen', 'Meera Iyer'],
    description: 'Procurement Group 2 (Chemicals, Power, Steam & Utilities)',
  },
  {
    id: 'grp-3',
    name: 'Group 3',
    type: 'Procurement',
    leaderName: 'Sandhya Singh',
    leaderNames: ['Sandhya Singh'],
    officerNames: ['Sandhya Singh', 'Vipul B', 'Rohit Sahu'],
    financeOfficerNames: ['Vikram Malhotra', 'Sneha Kulkarni'],
    estimateOfficerNames: ['Neha Deshmukh'],
    description: 'Procurement Group 3 (Mechanical Equipment, Packages & Spares)',
  },
  {
    id: 'grp-4',
    name: 'Group 4',
    type: 'Procurement',
    leaderName: 'Molay Adhikary',
    leaderNames: ['Molay Adhikary'],
    officerNames: ['Molay Adhikary', 'Dinesh Rawat'],
    financeOfficerNames: ['Priya Nair', 'Vikram Malhotra'],
    estimateOfficerNames: ['Devendra Rao'],
    description: 'Procurement Group 4 (Logistics, Transportation, Storage & Civil)',
  },
  {
    id: 'grp-5',
    name: 'Group 5',
    type: 'Procurement',
    leaderName: 'Kabir Sharma',
    leaderNames: ['Kabir Sharma'],
    officerNames: ['Kabir Sharma', 'Tanya Mehra'],
    financeOfficerNames: ['Ananya Verma'],
    estimateOfficerNames: ['Arjun Patel'],
    description: 'Procurement Group 5 (Electrical Systems & Instrumentation)',
  },
  {
    id: 'grp-6',
    name: 'Group 6',
    type: 'Procurement',
    leaderName: 'Vikram Sethi',
    leaderNames: ['Vikram Sethi'],
    officerNames: ['Vikram Sethi', 'Sunil Narang'],
    financeOfficerNames: ['Sneha Kulkarni', 'Rajesh J'],
    estimateOfficerNames: ['Rohan Sen'],
    description: 'Procurement Group 6 (IT, Digital Automation & Enterprise Services)',
  },
  {
    id: 'grp-fin',
    name: 'Finance Group',
    type: 'Finance',
    leaderName: 'Rajesh J',
    leaderNames: ['Rajesh J'],
    officerNames: [],
    financeOfficerNames: ['Rajesh J', 'Priya Nair', 'Ananya Verma', 'Vikram Malhotra', 'Sneha Kulkarni'],
    estimateOfficerNames: [],
    description: 'CPO Finance Concurrence, Budgeting & Commercial Review Group',
  },
  {
    id: 'grp-cec',
    name: 'Estimation Group',
    type: 'Estimation',
    leaderName: 'Meera Iyer',
    leaderNames: ['Meera Iyer'],
    officerNames: [],
    financeOfficerNames: [],
    estimateOfficerNames: ['Meera Iyer', 'Arjun Patel', 'Rohan Sen', 'Neha Deshmukh', 'Devendra Rao'],
    description: 'Central Estimation Cell (CEC) - Benchmarking & Cost Analysis',
  },
];

export const DEFAULT_LEADERSHIP_SETTINGS: EntityLeadershipSettings = {
  entityHeadName: 'CPO Executive (Management)',
  entityHeadDesignation: 'Chief Procurement Officer & Entity Head',
  financeHeadName: 'Rajesh J',
  financeHeadDesignation: 'Head of Finance & Chief Commercial Controller',
  estimateHeadName: 'Meera Iyer',
  estimateHeadDesignation: 'Head - Central Estimation Cell (CEC)',
};

export function isTenderRelatedToUser(tender: Tender, user: UserProfile): boolean {
  const userNameLower = user.name.toLowerCase();
  return (
    tender.pm_officer?.toLowerCase() === userNameLower ||
    (tender.attached_pms && tender.attached_pms.some((p) => p.toLowerCase() === userNameLower)) ||
    (tender.attached_fms && tender.attached_fms.some((f) => f.toLowerCase() === userNameLower)) ||
    (tender.attached_cec_officers && tender.attached_cec_officers.some((c) => c.toLowerCase() === userNameLower)) ||
    tender.current_holder?.toLowerCase() === userNameLower ||
    (tender.timeline && tender.timeline.some((l) => l.holder?.toLowerCase() === userNameLower)) ||
    !!tender.evaluation?.movements?.some((m) => m.officer?.toLowerCase() === userNameLower)
  );
}

export function getVisibleTenders(
  tenders: Tender[],
  user: UserProfile,
  leadership: EntityLeadershipSettings = DEFAULT_LEADERSHIP_SETTINGS,
  groups: GroupMasterItem[] = DEFAULT_GROUPS,
  allUsers?: UserProfile[]
): Tender[] {
  const userNameLower = user.name.toLowerCase();

  // Find latest user state from allUsers if provided
  const liveUser = (allUsers && allUsers.find((u) => u.id === user.id || u.name.toLowerCase() === userNameLower)) || user;
  const effectiveScope = liveUser.visibilityScope || user.visibilityScope;

  // 1. Entity Head / Admin / explicit ALL scope (PM, FM, or CEC with ALL access): Has access to ALL files
  if (
    leadership.entityHeadName?.toLowerCase() === userNameLower ||
    liveUser.role === 'ADMIN' ||
    user.role === 'ADMIN' ||
    effectiveScope === 'ALL'
  ) {
    return tenders;
  }

  // 2. Finance Head has access to ALL tenders
  if (leadership.financeHeadName?.toLowerCase() === userNameLower) {
    return tenders;
  }

  // 3. Estimate Head has access to ALL tenders
  if (leadership.estimateHeadName?.toLowerCase() === userNameLower) {
    return tenders;
  }

  // 4. Group Leader or visibilityScope === 'GROUP'
  const userGroups = getUserGroupNames(liveUser, user);
  const isLeader = isGroupLeaderUser(liveUser, user, groups, userGroups);

  if (effectiveScope === 'GROUP' || (isLeader && effectiveScope !== 'RELATED')) {
    return filterGroupTenders(tenders, liveUser, userGroups, allUsers);
  }

  // 5. Rest PM, FM, CEC managers: Only tenders related to them
  return tenders.filter((t) => isTenderRelatedToUser(t, liveUser));
}

function getUserGroupNames(liveUser: UserProfile, user: UserProfile): string[] {
  return Array.from(
    new Set([liveUser.group, user.group, ...(liveUser.assignedGroups || []), ...(user.assignedGroups || [])].filter(Boolean))
  ) as string[];
}

function isGroupLeaderUser(
  liveUser: UserProfile,
  user: UserProfile,
  groups: GroupMasterItem[],
  userGroups: string[]
): boolean {
  const userNameLower = user.name.toLowerCase();
  return (
    !!liveUser.isGroupLeader ||
    !!user.isGroupLeader ||
    groups.some(
      (g) =>
        userGroups.some((ug) => ug.toLowerCase() === g.name.toLowerCase()) &&
        (g.leaderName?.toLowerCase() === userNameLower ||
          (g.leaderNames && g.leaderNames.some((l) => l.toLowerCase() === userNameLower)))
    )
  );
}

function filterGroupTenders(
  tenders: Tender[],
  liveUser: UserProfile,
  userGroups: string[],
  allUsers?: UserProfile[]
): Tender[] {
  return tenders.filter((t) => {
    // Directly related
    if (isTenderRelatedToUser(t, liveUser)) return true;

    // Belongs to any of user's attached groups directly
    if (t.group && userGroups.some((ug) => ug.toLowerCase() === t.group!.toLowerCase())) {
      return true;
    }

    // Check if primary PM belongs to any of user's attached groups
    if (t.pm_officer) {
      const pmGroup = getOfficerGroup(t.pm_officer, allUsers);
      if (pmGroup && userGroups.some((ug) => ug.toLowerCase() === pmGroup.toLowerCase())) {
        return true;
      }
    }

    // Check if any attached PM belongs to any of user's attached groups
    if (t.attached_pms && t.attached_pms.length > 0) {
      const hasAttachedPmFromGroup = t.attached_pms.some((pm) => {
        const pmGrp = getOfficerGroup(pm, allUsers);
        return pmGrp && userGroups.some((ug) => ug.toLowerCase() === pmGrp.toLowerCase());
      });
      if (hasAttachedPmFromGroup) return true;
    }

    return false;
  });
}

/** Head level: Management (ADMIN) and the Entity, Finance and Estimate heads. */
export function isHeadLevelUser(
  user: UserProfile,
  leadership: EntityLeadershipSettings = DEFAULT_LEADERSHIP_SETTINGS
): boolean {
  const userNameLower = user.name.toLowerCase();
  return (
    user.role === 'ADMIN' ||
    [leadership.entityHeadName, leadership.financeHeadName, leadership.estimateHeadName].some(
      (head) => head?.toLowerCase() === userNameLower
    )
  );
}

/**
 * Tenders whose file movements (Timeline & Audit) a user may see. Only head level sees every
 * tender; a group leader sees the group's tenders; every other officer sees only the tenders
 * they work on, whatever their general visibility scope is.
 */
export function getAuditVisibleTenders(
  tenders: Tender[],
  user: UserProfile,
  leadership: EntityLeadershipSettings = DEFAULT_LEADERSHIP_SETTINGS,
  groups: GroupMasterItem[] = DEFAULT_GROUPS,
  allUsers?: UserProfile[]
): Tender[] {
  const userNameLower = user.name.toLowerCase();
  const liveUser = (allUsers && allUsers.find((u) => u.id === user.id || u.name.toLowerCase() === userNameLower)) || user;

  if (isHeadLevelUser(liveUser, leadership)) return tenders;

  const userGroups = getUserGroupNames(liveUser, user);
  const effectiveScope = liveUser.visibilityScope || user.visibilityScope;
  if (isGroupLeaderUser(liveUser, user, groups, userGroups) && effectiveScope !== 'RELATED') {
    return filterGroupTenders(tenders, liveUser, userGroups, allUsers);
  }

  return tenders.filter((t) => isTenderRelatedToUser(t, liveUser));
}

export function canUserEditMasters(
  user: UserProfile,
  leadership: EntityLeadershipSettings = DEFAULT_LEADERSHIP_SETTINGS
): boolean {
  if (user.role === 'ADMIN') return true;
  if (leadership.entityHeadName?.toLowerCase() === user.name.toLowerCase()) return true;
  return !!user.canEditMasters;
}

export function getOfficerGroup(officerName: string, allUsers?: UserProfile[]): string {
  const usersList = allUsers && allUsers.length > 0 ? allUsers : USERS;
  const user = usersList.find((u) => u.name.toLowerCase() === officerName.toLowerCase());
  if (user && user.group) return user.group;
  return 'Group 1';
}

export function getOfficersInGroup(groupName: string, allUsers?: UserProfile[]): UserProfile[] {
  const usersList = allUsers && allUsers.length > 0 ? allUsers : USERS;
  return usersList.filter((u) => u.group === groupName && u.role !== 'ADMIN');
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
  return `Rs. ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

export function formatCurrencyRs(valCr: number | null | undefined): string {
  if (valCr === null || valCr === undefined || isNaN(valCr)) return '—';
  const fullRs = Math.round(valCr * 10000000);
  return `Rs. ${fullRs.toLocaleString('en-IN')}`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('en-IN');
}

export const STAGE_STEPS: TenderStage[] = [
  'PR Received',
  'Under Estimation',
  'BQC approval',
  'To be Floated',
  'Under Bidding',
  'Under BQC / Tech Evaluation',
  'Cashflow report Preparation',
  'Under Negotiation',
  'Under Award Approval',
  'Awarded',
];

/** Standard procurement workflow stages */
export const NINE_STANDARD_STAGES: TenderStage[] = STAGE_STEPS;
export const STANDARD_WORKFLOW_STAGES: TenderStage[] = STAGE_STEPS;

/**
 * Normalizes any historical or raw timeline stage string into standard workflow stages.
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
  // BQC Approval (including FM review of BQC)
  if (
    s.includes('bqc approval') ||
    s.includes('bqc preparation') ||
    s.includes('finance review of bqc') ||
    s.includes('finance review for bqc') ||
    s.includes('review of bqc') ||
    s === 'bqc'
  ) {
    return 'BQC approval';
  }
  if (s.includes('to be floated') || s.includes('floated') || s.includes('publishing') || s.includes('nit')) {
    return 'To be Floated';
  }
  if (s.includes('bidding') || s.includes('pre-bid')) {
    return 'Under Bidding';
  }
  // Cashflow report preparation (Stage 7)
  if (s.includes('cashflow') || s.includes('cash flow')) {
    return 'Cashflow report Preparation';
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
  if (s.includes('negotiation')) {
    return 'Under Negotiation';
  }
  if (s.includes('award approval') || s.includes('under award approval') || s.includes('award tec') || s.includes('tec preparation') || s.includes('tec proposed')) {
    return 'Under Award Approval';
  }
  if (s.includes('awarded') || s.includes('committee') || s.includes('sanction') || s.includes('aoc')) {
    return 'Awarded';
  }

  return 'PR Received';
}

export const normalizeToStandardStages = normalizeToNineStages;

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
    case 'BQC approval':
    case 'BQC Preparation':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'To be Floated':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    case 'Under Bidding':
      return { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' };
    case 'Under BQC / Tech Evaluation':
      return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' };
    case 'Cashflow report Preparation':
      return { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' };
    case 'Under Negotiation':
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
    case 'Under Award Approval':
    case 'Under Award TEC':
      return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' };
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
 * Calculates elapsed working days (weekends and public holidays excluded, rounded to 1 decimal
 * place) between two date strings. Minimum is 0.
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
 * Calculates elapsed working hours (weekends and public holidays excluded, rounded to 1 decimal
 * place) between two date/datetime strings. Minimum is 0.
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
 * 2. Working-time difference (including hours/minutes) when start and end contain time.
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
    'Current Role',
    'SLA (Days)',
    'Tender Floated On',
    'BQC Evaluation Signed On',
    'EMD Evaluation Signed On',
    'Techno Commercial Signed On',
    'Cashflow Statement Signed On',
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
    `"${t.bqc_eval_signed_on || ''}"`,
    `"${t.emd_eval_signed_on || ''}"`,
    `"${t.techno_comm_signed_on || ''}"`,
    `"${t.cashflow_stmt_signed_on || ''}"`,
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
 * Checks whether an officer is the creator of the tender or the Primary Procurement Manager.
 * (Tenders can be created/floated by PM or CEC managers).
 */
export function isTenderCreatorOrPM(tender: Tender, officerName: string): boolean {
  if (!officerName) return false;
  const nameLower = officerName.trim().toLowerCase();
  const creatorLower = (tender.created_by || tender.pm_officer || '').trim().toLowerCase();
  const pmLower = (tender.pm_officer || '').trim().toLowerCase();
  return creatorLower === nameLower || pmLower === nameLower;
}

/**
 * Checks if the user has permission to view or manage post-award steps:
 * Visible only to the Tender Creator / Primary PM, as well as Entity Head and Admins who have access to his work.
 */
export function canViewPostAwardSteps(
  tender: Tender,
  user: UserProfile,
  leadership?: EntityLeadershipSettings
): boolean {
  if (user.role === 'ADMIN') return true;
  const nameLower = user.name.trim().toLowerCase();
  if (leadership && leadership.entityHeadName?.trim().toLowerCase() === nameLower) return true;
  return isTenderCreatorOrPM(tender, user.name);
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

/**
 * Default standard stages for the dynamic master
 */
export const DEFAULT_STAGE_MASTERS: StageMasterItem[] = [
  { id: 'stage-1', name: 'PR Received', stepNo: 1, defaultRole: 'PM', description: 'PR verification & initial indent acceptance', isStandard: true },
  { id: 'stage-2', name: 'Under Estimation', stepNo: 2, defaultRole: 'CEC', description: 'Cost Estimation Cell estimation & benchmark rate creation', isStandard: true },
  { id: 'stage-3', name: 'BQC approval', stepNo: 3, defaultRole: 'PM', description: 'Bidder Qualification Criteria preparation & FM vetting', isStandard: true },
  { id: 'stage-4', name: 'To be Floated', stepNo: 4, defaultRole: 'PM', description: 'NIT finalization & portal publishing', isStandard: true },
  { id: 'stage-5', name: 'Under Bidding', stepNo: 5, defaultRole: 'PM', description: 'Pre-bid queries, tender floating & bidding window', isStandard: true },
  { id: 'stage-6', name: 'Under BQC / Tech Evaluation', stepNo: 6, defaultRole: 'PM', description: 'Technical & commercial evaluation with user department', isStandard: true },
  { id: 'stage-7', name: 'Cashflow report Preparation', stepNo: 7, defaultRole: 'FM', description: 'Financial cashflow projection & commercial viability check', isStandard: true },
  { id: 'stage-8', name: 'Under Negotiation', stepNo: 8, defaultRole: 'PM', description: 'Price negotiation & discount optimization with L1 bidder', isStandard: true },
  { id: 'stage-9', name: 'Under Award Approval', stepNo: 9, defaultRole: 'PM', description: 'Tender committee sanction & executive award approval', isStandard: true },
  { id: 'stage-10', name: 'Awarded', stepNo: 10, defaultRole: 'PM', description: 'Terminal successful contract award & AOC issuance', isStandard: true },
];

/**
 * Default Public Holidays in India (Government Calendar)
 */
export const DEFAULT_PUBLIC_HOLIDAYS: PublicHolidayItem[] = [
  { date: '2024-01-26', name: 'Republic Day' },
  { date: '2024-03-25', name: 'Holi' },
  { date: '2024-04-11', name: 'Eid-ul-Fitr' },
  { date: '2024-05-23', name: 'Buddha Purnima' },
  { date: '2024-06-17', name: 'Bakrid / Eid-ul-Adha' },
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2024-10-12', name: 'Dussehra (Vijay Dashami)' },
  { date: '2024-10-31', name: 'Diwali (Deepavali)' },
  { date: '2024-11-15', name: 'Guru Nanak Jayanti' },
  { date: '2024-12-25', name: 'Christmas' },
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-03-14', name: 'Holi' },
  { date: '2025-03-31', name: 'Eid-ul-Fitr' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2025-10-21', name: 'Diwali (Deepavali)' },
  { date: '2025-12-25', name: 'Christmas' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Buddha Purnima' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra (Vijay Dashami)' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas' },
];

/**
 * Default Master SLA Rules configuration
 */
export const DEFAULT_SLA_RULES: SlaMasterRules = {
  excludeTechEval: true,
  excludeWeekends: true,
  excludeHolidays: true,
  holidays: DEFAULT_PUBLIC_HOLIDAYS,
  targetSlaOverallDays: 120,
  stageTargetDays: {
    'PR Received': 5,
    'Under Estimation': 15,
    'BQC approval': 10,
    'To be Floated': 7,
    'Under Bidding': 21,
    'Under BQC / Tech Evaluation': 20,
    'Cashflow report Preparation': 7,
    'Under Negotiation': 10,
    'Under Award Approval': 15,
    'Awarded': 10,
  },
};

/**
 * Helper to check if a date string/date is a weekend (Saturday or Sunday)
 */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

/**
 * Checks if a given Date matches a public holiday
 */
export function isPublicHoliday(d: Date, holidayList: PublicHolidayItem[]): boolean {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  return holidayList.some((h) => h.date === dateStr);
}

// The SLA rules every duration in the app is measured with. App sets them from the Masters.
let activeSlaRules: SlaMasterRules = DEFAULT_SLA_RULES;
let activeHolidayDates = new Set(DEFAULT_SLA_RULES.holidays.map((h) => h.date));

export function setActiveSlaRules(rules: SlaMasterRules): void {
  activeSlaRules = rules;
  activeHolidayDates = new Set((rules.holidays || []).map((h) => h.date));
}

/** True unless the day is a weekend or a public holiday (per the active SLA rules). */
export function isWorkingDay(d: Date): boolean {
  if (activeSlaRules.excludeWeekends && isWeekend(d)) return false;
  if (activeSlaRules.excludeHolidays) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (activeHolidayDates.has(`${yyyy}-${mm}-${dd}`)) return false;
  }
  return true;
}

/**
 * Milliseconds between two moments that fall on working days. Weekends and public holidays are
 * skipped entirely, so Friday 09:00 -> Monday 09:00 is exactly one day.
 */
export function workingMsBetween(start: Date, end: Date): number {
  let total = 0;
  let cursor = start;
  while (cursor < end) {
    const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const sliceEnd = nextMidnight < end ? nextMidnight : end;
    if (isWorkingDay(cursor)) total += sliceEnd.getTime() - cursor.getTime();
    cursor = sliceEnd;
  }
  return total;
}

/**
 * Calculates working days between two dates, optionally excluding weekends and public holidays
 */
export function calculateWorkingDaysBetween(
  startDate: Date,
  endDate: Date,
  options?: { excludeWeekends?: boolean; excludeHolidays?: boolean; holidays?: PublicHolidayItem[] }
): number {
  if (startDate > endDate) return 0;
  
  const excludeWeekends = options?.excludeWeekends ?? true;
  const excludeHolidays = options?.excludeHolidays ?? true;
  const holidays = options?.holidays ?? DEFAULT_PUBLIC_HOLIDAYS;

  let count = 0;
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cur <= end) {
    const isWk = isWeekend(cur);
    const isHol = isPublicHoliday(cur, holidays);

    if (excludeWeekends && isWk) {
      // skip weekend
    } else if (excludeHolidays && !isWk && isHol) {
      // skip weekday holiday
    } else {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

/**
 * Automatically derives or updates Key Milestone Dates based on the timeline and file movements.
 * Specifically:
 * - date_receipt_estimate_cec: The last date on which the file moved from CEC to PM.
 * - Key Milestone Dates are auto-generated as per file movements and advancing stages.
 */
export function deriveMilestoneDatesFromTimeline(tender: Tender): {
  date_receipt_estimate_cec: string;
  date_pr_initial_indent: string;
  receipt_actionable_pr: string;
  tender_floated_on: string;
  tender_opened_due_on: string;
  tender_sent_tech_eval: string;
  receipt_tech_eval: string;
  tec_proposed_on: string;
  tec_approval_date: string;
} {
  const tl = tender.timeline || [];

  // Find the last date on which the file moved from CEC to PM:
  // Look for either:
  // 1. A transition from CEC entry to PM entry (the CEC exit_date or next entry_date)
  // 2. Or the latest CEC entry that has an exit_date
  let lastCecToPmDate = tender.date_receipt_estimate_cec || '';
  for (let i = tl.length - 1; i >= 0; i--) {
    const curr = tl[i];
    const prev = i > 0 ? tl[i - 1] : null;

    if (prev && prev.role === 'CEC' && curr.role === 'PM') {
      lastCecToPmDate = prev.exit_date || curr.entry_date || lastCecToPmDate;
      break;
    }
    if (curr.role === 'CEC' && curr.exit_date) {
      if (!lastCecToPmDate) {
        lastCecToPmDate = curr.exit_date;
      }
    }
  }

  // Initial PR indent date
  const date_pr_initial_indent = tender.date_pr_initial_indent || tl[0]?.entry_date || '';

  // Actionable PR date (when PM accepted)
  const pmFirst = tl.find((t) => t.role === 'PM');
  const receipt_actionable_pr = tender.receipt_actionable_pr || pmFirst?.entry_date || date_pr_initial_indent;

  // Tender Floated On
  const floatedEntry = tl.find(
    (t) =>
      t.stage.toLowerCase().includes('floated') ||
      t.stage.toLowerCase().includes('bidding') ||
      t.remarks?.toLowerCase().includes('floated')
  );
  const tender_floated_on = tender.tender_floated_on || floatedEntry?.entry_date || '';

  // Tender Due On
  const tender_opened_due_on = tender.tender_opened_due_on || '';

  // Tender sent for tech eval
  const techEntry = tl.find(
    (t) =>
      t.stage.toLowerCase().includes('tech') ||
      t.stage.toLowerCase().includes('evaluation') ||
      t.remarks?.toLowerCase().includes('tech eval')
  );
  const tender_sent_tech_eval = tender.tender_sent_tech_eval || techEntry?.entry_date || '';

  // Receipt of tech eval
  const receipt_tech_eval = tender.receipt_tech_eval || techEntry?.exit_date || '';

  // TEC Proposed On
  const tecPropEntry = tl.find(
    (t) =>
      t.stage.toLowerCase().includes('tec') ||
      t.stage.toLowerCase().includes('award') ||
      t.stage.toLowerCase().includes('negotiation')
  );
  const tec_proposed_on = tender.tec_proposed_on || tecPropEntry?.entry_date || '';

  // TEC Approval Date
  const tecAppEntry = tl.find(
    (t) =>
      t.stage.toLowerCase().includes('approval') ||
      t.stage.toLowerCase().includes('awarded') ||
      t.remarks?.toLowerCase().includes('sanction')
  );
  const tec_approval_date = tender.tec_approval_date || tecAppEntry?.entry_date || '';

  return {
    date_receipt_estimate_cec: lastCecToPmDate,
    date_pr_initial_indent,
    receipt_actionable_pr,
    tender_floated_on,
    tender_opened_due_on,
    tender_sent_tech_eval,
    receipt_tech_eval,
    tec_proposed_on,
    tec_approval_date,
  };
}

/**
 * Calculates accurate SLA days for a tender according to the configurable SlaMasterRules:
 * - Excludes weekends (Saturday & Sunday)
 * - Excludes public holidays
 * - Excludes time between "Tender sent for technical evaluation" and "Receipt of Tech Evaluation"
 */
export function calculateAccurateSlaDays(tender: Tender, rules?: SlaMasterRules): {
  netSlaDays: number;
  totalCalendarDays: number;
  deductedWeekends: number;
  deductedHolidays: number;
  deductedTechEvalDays: number;
} {
  const activeRules = rules || DEFAULT_SLA_RULES;
  const milestones = deriveMilestoneDatesFromTimeline(tender);

  const startDateStr = milestones.receipt_actionable_pr || milestones.date_pr_initial_indent || tender.timeline?.[0]?.entry_date;
  if (!startDateStr) {
    return { netSlaDays: 0, totalCalendarDays: 0, deductedWeekends: 0, deductedHolidays: 0, deductedTechEvalDays: 0 };
  }

  const startDate = parseCustomDate(startDateStr) || new Date();
  let endDate = new Date();

  // If tender is already awarded, use award date or last timeline exit date
  if (tender.brief_status === 'Awarded') {
    const lastExit = tender.timeline?.[tender.timeline.length - 1]?.exit_date;
    if (lastExit) {
      endDate = parseCustomDate(lastExit) || endDate;
    }
  }

  // Calculate gross calendar days
  const grossDiffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalCalendarDays = Math.max(1, Math.round(grossDiffMs / (1000 * 60 * 60 * 24)));

  let deductedWeekends = 0;
  let deductedHolidays = 0;
  let deductedTechEvalDays = 0;

  // Track tech eval interval dates if excludeTechEval is enabled
  let techStart: Date | null = null;
  let techEnd: Date | null = null;

  if (activeRules.excludeTechEval) {
    const sentStr = milestones.tender_sent_tech_eval || tender.tender_sent_tech_eval;
    const recvStr = milestones.receipt_tech_eval || tender.receipt_tech_eval;

    if (sentStr) {
      techStart = parseCustomDate(sentStr);
      if (recvStr) {
        techEnd = parseCustomDate(recvStr);
      } else {
        // If still under technical evaluation, currently up to now
        if (tender.brief_status === 'Under BQC / Tech Evaluation') {
          techEnd = new Date();
        }
      }
    }
  }

  // Day-by-day iteration from startDate to endDate
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  let workingDays = 0;

  while (cur <= end) {
    const isWk = isWeekend(cur);
    const isHol = isPublicHoliday(cur, activeRules.holidays);
    const inTechEval =
      activeRules.excludeTechEval &&
      techStart &&
      techEnd &&
      cur >= new Date(techStart.getFullYear(), techStart.getMonth(), techStart.getDate()) &&
      cur <= new Date(techEnd.getFullYear(), techEnd.getMonth(), techEnd.getDate());

    if (activeRules.excludeWeekends && isWk) {
      deductedWeekends++;
    } else if (activeRules.excludeHolidays && !isWk && isHol) {
      deductedHolidays++;
    } else if (inTechEval) {
      deductedTechEvalDays++;
    } else {
      workingDays++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return {
    netSlaDays: Math.max(0, workingDays),
    totalCalendarDays,
    deductedWeekends,
    deductedHolidays,
    deductedTechEvalDays,
  };
}

const HOUR_MS = 1000 * 60 * 60;
const roundTo1 = (value: number) => Math.round(value * 10) / 10;

/**
 * While a tender is 'Under BQC / Tech Evaluation' the tender creator and Finance work in parallel
 * under two sub-stages. The creator sends all or some bidders to Finance and Finance returns them
 * after checking; the stage's time is divided between them by the bidders each one holds.
 */
export const EVALUATION_STAGE: TenderStage = 'Under BQC / Tech Evaluation';

export function getEvaluationSubStages(tender: Tender): EvaluationSubStage[] {
  return tender.bqc_required === 'NO' ? ['EMD Evaluation'] : ['EMD Evaluation', 'BQC Evaluation'];
}

export interface EvaluationSubStageSummary {
  subStage: EvaluationSubStage;
  completedOn: string | null;
  withCreator: string[];
  withFinance: { officer: string; bidders: string[] }[];
  /** Bidder-weighted working hours; creatorHours + financeHours is the time the sub-stage ran. */
  creatorHours: number;
  financeHours: { officer: string; hours: number }[];
}

export interface EvaluationSplit {
  subStages: EvaluationSubStageSummary[];
  /** One entry per stretch a finance officer held bidders, placed after tender.timeline[mainIndex]. */
  parallelEntries: { mainIndex: number; entry: TimelineLogEntry }[];
  /** Working time to take off the file holder's own entries, by index in tender.timeline. */
  mainReductionMs: Map<number, number>;
}

/**
 * Replays the bidder movements of a tender. For every moment the file is in the evaluation stage,
 * a sub-stage's time goes to Finance in proportion to the bidders Finance holds and the rest stays
 * with the file holder. The sub-stages run side by side, so the stage total is their average and
 * always adds up to the time actually elapsed.
 */
export function computeEvaluationSplit(tender: Tender, now: Date = new Date()): EvaluationSplit {
  const subStageNames = getEvaluationSubStages(tender);
  const bidders = tender.evaluation?.bidders || [];
  const total = bidders.length;
  const timeline = tender.timeline || [];

  const movements = (tender.evaluation?.movements || [])
    .map((m) => ({ m, time: parseCustomDate(m.at) }))
    .filter((x): x is { m: EvaluationMovement; time: Date } => !!x.time)
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  // The stretches during which the file was in the evaluation stage
  const windows: { index: number; start: Date; end: Date; isOpen: boolean }[] = [];
  timeline.forEach((entry, index) => {
    if (normalizeToNineStages(entry.stage) !== EVALUATION_STAGE) return;
    const start = parseCustomDate(entry.entry_date);
    const end = entry.exit_date ? parseCustomDate(entry.exit_date) : now;
    if (start && end && end > start) windows.push({ index, start, end, isOpen: !entry.exit_date });
  });

  interface Period {
    subStage: EvaluationSubStage;
    officer: string;
    startStr: string;
    endStr: string | null;
    weightedMs: number;
    bidders: Set<string>;
    mainIndex: number;
  }

  const heldBy = new Map<EvaluationSubStage, Map<string, string>>(); // bidder -> finance officer
  const subTotals = new Map<EvaluationSubStage, { creatorMs: number; financeMs: Map<string, number> }>();
  const completedAt = new Map<EvaluationSubStage, Date | null>();
  subStageNames.forEach((s) => {
    heldBy.set(s, new Map());
    subTotals.set(s, { creatorMs: 0, financeMs: new Map() });
    completedAt.set(s, parseCustomDate(tender.evaluation?.completed_on?.[s]));
  });

  const periods: Period[] = [];
  const openPeriods = new Map<string, Period>();
  const mainReductionMs = new Map<number, number>();

  const mainIndexAt = (time: Date): number => {
    const containing = windows.find((w) => w.start <= time && time < w.end);
    const fallback = windows.find((w) => w.end > time) || windows[windows.length - 1];
    return (containing || fallback)?.index ?? timeline.length - 1;
  };

  const apply = ({ m, time }: { m: EvaluationMovement; time: Date }) => {
    const held = heldBy.get(m.sub_stage);
    if (!held) return;
    const key = `${m.sub_stage}|${m.officer}`;

    if (m.action === 'sent') {
      const moved = m.bidders.filter((b) => bidders.includes(b));
      if (moved.length === 0) return;
      moved.forEach((b) => held.set(b, m.officer));
      let period = openPeriods.get(key);
      if (!period) {
        period = {
          subStage: m.sub_stage,
          officer: m.officer,
          startStr: m.at,
          endStr: null,
          weightedMs: 0,
          bidders: new Set(),
          mainIndex: mainIndexAt(time),
        };
        openPeriods.set(key, period);
        periods.push(period);
      }
      moved.forEach((b) => period!.bidders.add(b));
    } else {
      m.bidders.forEach((b) => {
        if (held.get(b) === m.officer) held.delete(b);
      });
      const period = openPeriods.get(key);
      if (period && !Array.from(held.values()).includes(m.officer)) {
        period.endStr = m.at;
        openPeriods.delete(key);
      }
    }
  };

  const points = new Set<number>();
  windows.forEach((w) => {
    points.add(w.start.getTime());
    points.add(w.end.getTime());
  });
  movements.forEach((x) => points.add(x.time.getTime()));
  completedAt.forEach((d) => d && points.add(d.getTime()));
  const sortedPoints = Array.from(points).sort((a, b) => a - b);

  let nextMovement = 0;
  for (let i = 0; i < sortedPoints.length; i++) {
    const from = sortedPoints[i];
    while (nextMovement < movements.length && movements[nextMovement].time.getTime() <= from) {
      apply(movements[nextMovement++]);
    }
    const to = sortedPoints[i + 1];
    if (to === undefined) break;

    const window = windows.find((w) => w.start.getTime() <= from && to <= w.end.getTime());
    if (!window || total === 0) continue;
    const open = subStageNames.filter((s) => {
      const done = completedAt.get(s);
      return !done || from < done.getTime();
    });
    if (open.length === 0) continue;
    const ms = workingMsBetween(new Date(from), new Date(to));
    if (ms <= 0) continue;

    open.forEach((s) => {
      const held = heldBy.get(s)!;
      const totals = subTotals.get(s)!;
      const countByOfficer = new Map<string, number>();
      held.forEach((officer) => countByOfficer.set(officer, (countByOfficer.get(officer) || 0) + 1));

      totals.creatorMs += (ms * (total - held.size)) / total;
      countByOfficer.forEach((count, officer) => {
        const share = (ms * count) / total;
        totals.financeMs.set(officer, (totals.financeMs.get(officer) || 0) + share);
        const stageShare = share / open.length;
        const period = openPeriods.get(`${s}|${officer}`);
        if (period) period.weightedMs += stageShare;
        mainReductionMs.set(window.index, (mainReductionMs.get(window.index) || 0) + stageShare);
      });
    });
  }

  // Bidders still out when the file left the stage: their stretch ends with the stage
  const lastWindow = windows[windows.length - 1];
  if (lastWindow && !lastWindow.isOpen) {
    openPeriods.forEach((period) => {
      period.endStr = timeline[lastWindow.index].exit_date;
    });
  }

  const roleOf = (name: string): UserRole =>
    USERS.find((u) => u.name.toLowerCase() === name.toLowerCase())?.role || 'FM';

  return {
    subStages: subStageNames.map((s) => {
      const held = heldBy.get(s)!;
      const totals = subTotals.get(s)!;
      const byOfficer = new Map<string, string[]>();
      held.forEach((officer, bidder) => byOfficer.set(officer, [...(byOfficer.get(officer) || []), bidder]));
      return {
        subStage: s,
        completedOn: tender.evaluation?.completed_on?.[s] || null,
        withCreator: bidders.filter((b) => !held.has(b)),
        withFinance: Array.from(byOfficer, ([officer, names]) => ({ officer, bidders: names })),
        creatorHours: roundTo1(totals.creatorMs / HOUR_MS),
        financeHours: Array.from(totals.financeMs, ([officer, ms]) => ({ officer, hours: roundTo1(ms / HOUR_MS) })),
      };
    }),
    parallelEntries: periods.map((p) => {
      const hours = roundTo1(p.weightedMs / HOUR_MS);
      const names = Array.from(p.bidders);
      return {
        mainIndex: p.mainIndex,
        entry: {
          stage: EVALUATION_STAGE,
          sub_stage: p.subStage,
          parallel: true,
          role: roleOf(p.officer),
          holder: p.officer,
          entry_date: p.startStr,
          exit_date: p.endStr,
          days_spent: p.endStr ? roundTo1(hours / 24) : null,
          hours_spent: hours,
          bidders: names,
          remarks: `${names.length} of ${total} bidders: ${names.join(', ')}`,
        },
      };
    }),
    mainReductionMs,
  };
}

/**
 * tender.timeline is the custody of the file itself. This adds the parallel evaluation work to it:
 * one entry per stretch a finance officer held bidders, with that time taken off the file holder.
 * Use it wherever time is reported; use tender.timeline where the current holder matters.
 */
export function getEffectiveTimeline(tender: Tender, now: Date = new Date()): TimelineLogEntry[] {
  const main = tender.timeline || [];
  if (!tender.evaluation?.movements?.length) return main;

  const split = computeEvaluationSplit(tender, now);
  const result: TimelineLogEntry[] = [];
  main.forEach((entry, index) => {
    const reductionMs = split.mainReductionMs.get(index) || 0;
    const start = parseCustomDate(entry.entry_date);
    const end = entry.exit_date ? parseCustomDate(entry.exit_date) : now;
    if (reductionMs > 0 && start && end) {
      const hours = Math.max(0, roundTo1((workingMsBetween(start, end) - reductionMs) / HOUR_MS));
      result.push({ ...entry, hours_spent: hours, days_spent: entry.exit_date ? roundTo1(hours / 24) : null });
    } else {
      result.push(entry);
    }
    split.parallelEntries.filter((p) => p.mainIndex === index).forEach((p) => result.push(p.entry));
  });
  return result;
}

/** Finance officers who are holding bidders of this tender right now. */
export function getEvaluationHolders(tender: Tender): string[] {
  if (tender.brief_status !== EVALUATION_STAGE || !tender.evaluation?.movements?.length) return [];
  const names = new Set<string>();
  computeEvaluationSplit(tender).subStages.forEach((s) => s.withFinance.forEach((f) => names.add(f.officer)));
  return Array.from(names);
}

/** True when bidders of this tender sent for EMD / BQC evaluation are with this officer right now. */
export function holdsEvaluationBidders(tender: Tender, officerName: string): boolean {
  const nameLower = officerName.trim().toLowerCase();
  return getEvaluationHolders(tender).some((holder) => holder.toLowerCase() === nameLower);
}

// Stage names used before the workflow was extended to ten stages
const LEGACY_STATUS: Record<string, TenderStage> = {
  'BQC Preparation': 'BQC approval',
  'Under Award TEC': 'Under Award Approval',
};

/**
 * Brings a tender in line with the current rules: a legacy status is mapped to today's stage and
 * every stored day count (timeline entries, days by role, SLA, committee time) is recomputed from
 * its dates as working days. Figures without dates to derive them from are left as they are.
 * Safe to run repeatedly.
 */
export function normalizeTender(tender: Tender): Tender {
  const timeline = (tender.timeline || []).map((entry) => {
    if (!entry.exit_date) return entry;
    const days = calculateElapsedDays(entry.entry_date, entry.exit_date);
    if (days <= 0) return entry; // same-moment entries (e.g. the Awarded marker) keep their token value
    return {
      ...entry,
      days_spent: days,
      hours_spent:
        entry.hours_spent === null || entry.hours_spent === undefined
          ? entry.hours_spent
          : calculateElapsedHours(entry.entry_date, entry.exit_date),
    };
  });

  const normalized: Tender = {
    ...tender,
    brief_status: LEGACY_STATUS[tender.brief_status] ?? tender.brief_status,
    timeline,
  };

  if (timeline.length > 0) {
    const closed = getEffectiveTimeline(normalized).filter((entry) => entry.exit_date);
    const sumFor = (role: UserRole) =>
      roundTo1(closed.filter((entry) => entry.role === role).reduce((sum, entry) => sum + (entry.days_spent ?? 0), 0));
    normalized.days_by_role = { PM: sumFor('PM'), FM: sumFor('FM'), CEC: sumFor('CEC') };

    if (tender.sla_days !== null && tender.sla_days !== undefined) {
      const slaStart = tender.receipt_actionable_pr || tender.date_pr_initial_indent;
      const recomputed = calculateElapsedDays(slaStart, timeline[timeline.length - 1].entry_date);
      if (recomputed > 0) normalized.sla_days = recomputed;
    }
  }

  if (tender.time_taken_approving_committee_days !== null && tender.time_taken_approving_committee_days !== undefined) {
    const recomputed = calculateElapsedDays(tender.tec_proposed_on, tender.tec_approval_date);
    if (recomputed > 0) normalized.time_taken_approving_committee_days = recomputed;
  }

  return normalized;
}
