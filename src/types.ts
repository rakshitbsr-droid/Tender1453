export type UserRole = 'PM' | 'FM' | 'CEC' | 'ADMIN';

export type TenderStage =
  | 'PR Received'
  | 'Under Estimation'
  | 'BQC approval'
  | 'BQC Preparation' // backwards compatibility
  | 'To be Floated'
  | 'Under Bidding'
  | 'Under BQC / Tech Evaluation'
  | 'Cashflow report Preparation'
  | 'Under Award TEC' // backwards compatibility
  | 'Under Negotiation'
  | 'Under Award Approval'
  | 'Awarded'
  | 'Cancelled'
  | 'Under Discussion with User'
  | string;

export interface PostAwardStep {
  id: string;
  title: string;
  notes?: string;
  due_date?: string;
  reminder?: string; // Optional Date & Time reminder
  completed: boolean;
  completed_at?: string;
  created_at: string;
  created_by: string; // officer name
}

export interface TenderCancellationInfo {
  cancelled_on: string;
  cancelled_by: string;
  cancelled_role: UserRole | string;
  reason: string;
  remarks?: string;
  stage_at_cancellation: TenderStage;
}

export interface TenderClosureInfo {
  closed_on: string;
  closed_by: string;
  remarks?: string;
}

export interface UserTaskStep {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface UserTask {
  id: string;
  title: string;
  assigned_to: string; // user name or id
  completed: boolean;
  completed_at?: string;
  created_at: string;
  due_date?: string;
  reminder?: string;
  is_my_day?: boolean;
  is_important?: boolean;
  recurrence?: TaskRecurrence;
  steps: UserTaskStep[];
  category?: string;
  notes?: string;
  linked_tender_pr?: string;
  urgency: 'urgent' | 'not_urgent';
  importance: 'important' | 'not_important';
}

export interface StageMasterItem {
  id: string;
  name: string;
  stepNo: number;
  defaultRole: UserRole;
  description?: string;
  isStandard?: boolean;
}

export interface UserFunctionMasterItem {
  id: string;
  name: string;
  department?: string;
  description?: string;
  isActive?: boolean;
}

export interface TenderTypeMasterItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface PublicHolidayItem {
  date: string;
  name: string;
}

export interface SlaMasterRules {
  excludeTechEval: boolean;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  holidays: PublicHolidayItem[];
  targetSlaOverallDays: number;
  stageTargetDays: Record<string, number>;
}

export type TenderType = 'Open' | 'Limited' | 'Single' | 'OEM' | 'SOR' | 'QCBS' | string;

export type UserFunction =
  | 'E&P-Services'
  | 'E&P-Bargarh'
  | 'Brand'
  | 'RE'
  | 'SOR'
  | 'HSSE'
  | 'Alpha Services'
  | 'Beta Operations'
  | 'Gamma Retail'
  | 'Delta Logistics'
  | 'Epsilon Safety'
  | 'Zeta Digital'
  | string;

export interface TimelineLogEntry {
  stage: string;
  role: UserRole;
  holder: string;
  entry_date: string;
  exit_date: string | null;
  days_spent: number | null;
  hours_spent?: number | null;
  remarks?: string;
  action_type?: string;
  // Set only on entries derived from the parallel EMD / BQC evaluation (see getEffectiveTimeline)
  sub_stage?: EvaluationSubStage;
  parallel?: boolean;
  bidders?: string[];
}

export type EvaluationSubStage = 'EMD Evaluation' | 'BQC Evaluation';

export interface EvaluationMovement {
  id: string;
  sub_stage: EvaluationSubStage;
  action: 'sent' | 'returned';
  bidders: string[];
  officer: string; // finance officer the bidders went to, or came back from
  by: string; // who recorded the movement
  at: string; // 'DD-MM-YYYY HH:mm'
  remarks?: string;
}

// Parallel work during 'Under BQC / Tech Evaluation': the tender creator sends all or some bidders
// to Finance under each sub-stage and Finance returns them after checking.
export interface TenderEvaluation {
  bidders: string[];
  movements: EvaluationMovement[];
  completed_on?: Partial<Record<EvaluationSubStage, string>>; // 'DD-MM-YYYY HH:mm'
}

export interface Tender {
  sr_no: number;
  pr_no: string;
  crfq_no: string;
  date_pr_initial_indent: string;
  receipt_actionable_pr: string;
  tender_sent_tech_eval: string;
  receipt_tech_eval: string;
  item_description: string;
  user_function: UserFunction | string;
  date_receipt_estimate_cec: string;
  pm_officer: string; // Primary PM
  created_by?: string; // Tender creator (can be PM, FM, CEC, or ADMIN)
  creator_role?: UserRole | string;
  attached_pms: string[];
  tender_type: TenderType;
  tender_floated_on: string;
  tender_opened_due_on: string;

  // Key Milestone Sign-offs (Editable, non-compulsory until sending for award)
  bqc_eval_signed_on?: string; // BQC Evaluation Signed on
  emd_eval_signed_on?: string; // EMD evaluation signed on
  techno_comm_signed_on?: string; // Techno commercial signed on
  cashflow_stmt_signed_on?: string; // Cashflow statement signed on

  // Scope & Evaluation settings
  delivery_location?: string;
  requisitioner_contact?: string;
  tech_eval_required?: 'YES' | 'NO';
  bqc_required?: 'YES' | 'NO';

  estimate_value_cr: number | null;
  brief_status: TenderStage;
  awarded_value_cr: number | null;
  tec_proposed_on: string;
  tec_approval_date: string;
  tender_register_updated: 'YES' | 'NO' | '';
  aoc_completed: 'YES' | 'NO' | '';
  contract_ola_created: 'YES' | 'NO' | '';
  sla_days: number | null;
  savings_due_to_negotiation_cr: number | null;
  time_taken_approving_committee_days: number | null;
  month_year: string;
  remarks: string;
  attached_fms: string[];
  attached_cec_officers: string[];
  current_holder: string;
  current_role: UserRole | '';
  priority: 'High' | 'Medium' | 'Normal' | 'Critical';
  group?: string;
  days_by_role: {
    PM: number;
    FM: number;
    CEC: number;
  };
  timeline: TimelineLogEntry[];
  evaluation?: TenderEvaluation;
  post_award_steps?: PostAwardStep[];
  is_closed?: boolean;
  closure_info?: TenderClosureInfo;
  cancellation_info?: TenderCancellationInfo;
  urgency?: 'urgent' | 'not_urgent';
  importance?: 'important' | 'not_important';
}

export type VisibilityScope = 'RELATED' | 'GROUP' | 'ALL';

export type GroupType = 'Procurement' | 'Finance' | 'Estimation' | 'General';

export interface GroupMasterItem {
  id: string;
  name: string;
  type: GroupType;
  leaderName: string; // primary/legacy leader name
  leaderNames?: string[]; // multiple leaders can be attached
  officerNames?: string[]; // PM officers attached to this group
  financeOfficerNames?: string[]; // Multiple Finance officers can be attached
  estimateOfficerNames?: string[]; // Multiple Estimate / CEC officers can be attached
  description?: string;
}

export interface EntityLeadershipSettings {
  entityHeadName: string;
  entityHeadDesignation?: string;
  financeHeadName: string;
  financeHeadDesignation?: string;
  estimateHeadName: string;
  estimateHeadDesignation?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  designation: string;
  pillar: string;
  group?: string; // primary group
  assignedGroups?: string[]; // Multiple groups an officer is attached to (CEC & Finance multi-group attachment)
  email: string;
  avatarColor: string;
  isGroupLeader?: boolean;
  visibilityScope?: VisibilityScope;
  canEditMasters?: boolean;
}

export interface FilterState {
  searchQuery: string;
  pmFilter: string;
  fmFilter: string;
  cecFilter: string;
  typeFilter: string;
  functionFilter: string;
  statusFilter: string;
  monthFilter: string;
  slaMaxDays: number;
}
