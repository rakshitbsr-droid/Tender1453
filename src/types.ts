export type UserRole = 'PM' | 'FM' | 'CEC' | 'ADMIN';

export type TenderStage =
  | 'PR Received'
  | 'Under Estimation'
  | 'BQC Preparation'
  | 'To be Floated'
  | 'Under Bidding'
  | 'Under BQC / Tech Evaluation'
  | 'Under Award TEC'
  | 'Under Negotiation'
  | 'Awarded'
  | 'Cancelled'
  | 'Under Discussion with User';

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
  | 'Zeta Digital';

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
  attached_pms: string[];
  tender_type: TenderType;
  tender_floated_on: string;
  tender_opened_due_on: string;
  estimate_value_cr: number;
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
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  designation: string;
  pillar: string;
  group?: string;
  email: string;
  avatarColor: string;
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
