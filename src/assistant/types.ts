import {
  EntityLeadershipSettings,
  GroupMasterItem,
  SlaMasterRules,
  Tender,
  TenderStage,
  UserProfile,
  UserRole,
  UserTask,
} from '../types';

/** Everything the assistant may look at. It works on what the current user is allowed to see. */
export interface AssistantData {
  tenders: Tender[]; // tenders visible to the current user
  auditTenders: Tender[]; // tenders whose file movements the current user may see
  currentUser: UserProfile;
  users: UserProfile[];
  groups: GroupMasterItem[];
  slaRules: SlaMasterRules;
  leadership: EntityLeadershipSettings;
  tasks: UserTask[];
}

export type StatusClass = 'pipeline' | 'awarded' | 'cancelled' | 'closed' | 'postAward';
export type DateField = 'received' | 'floated' | 'due' | 'awarded' | 'cancelled';
export type GroupBy = 'stage' | 'officer' | 'holder' | 'group' | 'type' | 'function' | 'role' | 'month' | 'priority' | 'status';
export type Measure = 'count' | 'value' | 'awarded' | 'savings' | 'sla' | 'ageing';

export interface Filters {
  stages?: TenderStage[];
  status?: StatusClass;
  holders?: string[]; // file (or evaluation bidders) is with one of these officers now
  holderRole?: UserRole; // file is with this team now
  officers?: string[]; // officer works on the tender in any capacity
  groups?: string[];
  types?: string[];
  functions?: string[];
  priorities?: string[];
  delayed?: boolean;
  noEstimate?: boolean; // estimate not entered yet
  valueMin?: number; // Rs Cr
  valueMax?: number;
  ageMin?: number; // working days in the current stage
  ageMax?: number;
  slaMin?: number; // working days since PR receipt
  slaMax?: number;
  date?: { field: DateField; from: number; to: number; label: string };
  words?: string[]; // words that must appear in the description
}

export type Intent =
  | 'tender'
  | 'list'
  | 'count'
  | 'total'
  | 'average'
  | 'breakdown'
  | 'top'
  | 'summary'
  | 'bottleneck'
  | 'roleTime'
  | 'workload'
  | 'evaluation'
  | 'compare'
  | 'cancelReasons'
  | 'postAward'
  | 'holidays'
  | 'tasks'
  | 'people'
  | 'help'
  | 'thanks'
  | 'unknown';

export type TenderFocus = 'timeline' | 'holder' | 'dates' | 'value' | 'bidders' | 'time' | 'cancel' | 'delay';

export interface Query {
  intent: Intent;
  filters: Filters;
  groupBy?: GroupBy;
  measure?: Measure;
  sort?: { by: Measure | 'date'; dir: 'asc' | 'desc' };
  limit?: number;
  tenderRefs: number[]; // sr_no of the tenders named in the question
  missingRef?: string; // a PR / CRFQ / tender number that matched nothing
  tenderFocus?: TenderFocus;
  tenderDate?: DateField; // the date a "when" question asks for
  officerSpeed?: 'slowest' | 'fastest'; // rank officers by handling time
  compare?: { kind: 'group' | 'officer' | 'stage' | 'type'; values: string[] };
  role?: UserRole; // a team named in the question (finance, procurement, estimation)
  ambiguous?: { word: string; options: string[] }; // a name that fits several officers
  refine: boolean; // the question builds on the previous answer
  notUnderstood: string[];
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'right';
  mono?: boolean;
}

export interface TableRow {
  cells: Record<string, string | number>;
  srNo?: number; // clicking the row opens this tender
}

export type AnswerBlock =
  | { type: 'text'; text: string } // **bold** is supported
  | { type: 'stats'; items: { label: string; value: string }[] }
  | { type: 'table'; title?: string; columns: TableColumn[]; rows: TableRow[] }
  | { type: 'bars'; title?: string; items: { label: string; value: number; display: string }[] }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'tender'; srNo: number };

export interface Answer {
  chips: string[]; // how the question was understood
  blocks: AnswerBlock[];
  suggestions: string[];
  filters: Filters; // carried into follow-up questions
}
