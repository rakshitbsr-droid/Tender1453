import { UserProfile, UserTask } from '../types';

// Officers and tenders are served by the .NET backend (backend/TenderTracker.Api, seed JSON in Data/Seed).
// USERS is filled from GET /api/users by App before any view renders and kept in step with the
// Officers master, so components can keep reading it synchronously.
export const USERS: UserProfile[] = [];

export function setUsers(users: UserProfile[]): void {
  USERS.splice(0, USERS.length, ...users);
}

export const ORDERED_STAGES = [
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
] as const;

// Starter tasks, used until the first change to the task list is saved
export const INITIAL_USER_TASKS: UserTask[] = [
  {
    id: 'task-1',
    title: 'Review Bank Guarantee (PBG) for Offshore Subsea Pipeline',
    assigned_to: 'Amit Kumar Jha',
    completed: false,
    created_at: '2025-01-29',
    due_date: '2025-02-05',
    reminder: '2025-02-04 09:00',
    is_my_day: true,
    is_important: true,
    category: 'Procurement',
    linked_tender_pr: 'PR1000412891',
    urgency: 'urgent',
    importance: 'important',
    notes: 'Verify 10% Performance Bank Guarantee submitted by L1 vendor through SFMS confirmation.',
    steps: [
      { id: 's1', title: 'Obtain SFMS advice from SBI Overseas branch', completed: true },
      { id: 's2', title: 'Verify BG format against standard CPO template', completed: false },
      { id: 's3', title: 'Forward copy to Finance for safe custody', completed: false },
    ],
  },
  {
    id: 'task-2',
    title: 'Finalize Operating Level Agreement (OLA) with Plant User Dept',
    assigned_to: 'Amit Kumar Jha',
    completed: false,
    created_at: '2025-01-30',
    due_date: '2025-02-10',
    is_my_day: true,
    is_important: true,
    category: 'Legal / Contract',
    linked_tender_pr: 'PR1000412891',
    urgency: 'urgent',
    importance: 'important',
    notes: 'Draft OLA for post-award spare delivery timeline and emergency response protocol.',
    steps: [
      { id: 's4', title: 'Draft OLA SLA terms', completed: true },
      { id: 's5', title: 'Circulate to User Department Head for signature', completed: false },
    ],
  },
  {
    id: 'task-3',
    title: 'Schedule Vendor Kickoff Meeting for Gas Turbine AMC',
    assigned_to: 'Amit Kumar Jha',
    completed: false,
    created_at: '2025-01-28',
    due_date: '2025-02-12',
    is_my_day: false,
    is_important: false,
    category: 'Vendor Follow-up',
    linked_tender_pr: 'PR1000418902',
    urgency: 'not_urgent',
    importance: 'important',
    notes: 'Coordinate with OEM service engineers and plant maintenance engineers for mobilization.',
    steps: [
      { id: 's6', title: 'Send invitation to vendor project manager', completed: false },
      { id: 's7', title: 'Book conference room / Teams meeting link', completed: false },
    ],
  },
  {
    id: 'task-4',
    title: 'Compile monthly CPO cost savings summary report',
    assigned_to: 'Amit Kumar Jha',
    completed: false,
    created_at: '2025-01-25',
    due_date: '2025-02-02',
    is_my_day: false,
    is_important: false,
    category: 'Audit & Reports',
    urgency: 'urgent',
    importance: 'not_important',
    notes: 'Summarize negotiation savings achieved across all Group 1 files for entity executive review.',
    steps: [],
  },
  {
    id: 'task-5',
    title: 'Archive completed vendor pre-qualification files for Q3',
    assigned_to: 'Amit Kumar Jha',
    completed: true,
    completed_at: '2025-01-26',
    created_at: '2025-01-20',
    is_my_day: false,
    is_important: false,
    category: 'Administrative',
    urgency: 'not_urgent',
    importance: 'not_important',
    notes: 'Physical and digital records scanned and moved to records archive room.',
    steps: [
      { id: 's8', title: 'Scan documents to DMS archive', completed: true },
      { id: 's9', title: 'Update physical box register', completed: true },
    ],
  },
];
