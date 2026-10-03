import {
  EntityLeadershipSettings,
  GroupMasterItem,
  SlaMasterRules,
  StageMasterItem,
  Tender,
  TenderTypeMasterItem,
  UserFunctionMasterItem,
  UserProfile,
  UserTask,
} from '../types';

// In development requests go to /api on the Vite dev server, which proxies them to the .NET backend
// (see vite.config.ts). A hosted build sets VITE_API_BASE to the API's public URL, e.g.
// https://tender-tracker-api.onrender.com/api (see README.md, "Deploy").
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

/** Master data and the task list. A key that was never saved is absent and the app uses its default. */
export interface AppSettings {
  stages: StageMasterItem[];
  slaRules: SlaMasterRules;
  groups: GroupMasterItem[];
  userFunctions: UserFunctionMasterItem[];
  tenderTypes: TenderTypeMasterItem[];
  leadershipSettings: EntityLeadershipSettings;
  tasks: UserTask[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    // ASP.NET Core returns RFC 7807 problem details for validation failures
    const problem = await res.json().catch(() => null);
    const fieldErrors = problem?.errors ? Object.values(problem.errors).flat().join(' ') : '';
    throw new Error(fieldErrors || problem?.title || `Request failed (${res.status} ${res.statusText})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });

export const api = {
  getUsers: () => request<UserProfile[]>('/users'),
  saveUsers: (users: UserProfile[]) => request<UserProfile[]>('/users', put(users)),
  getTenders: () => request<Tender[]>('/tenders'),
  createTender: (tender: Tender) =>
    request<Tender>('/tenders', { method: 'POST', body: JSON.stringify(tender) }),
  // Hand-offs, evaluation movements and edits are worked out in the app and saved whole
  saveTender: (tender: Tender) => request<Tender>(`/tenders/${tender.sr_no}`, put(tender)),
  getSettings: () => request<Partial<AppSettings>>('/settings'),
  saveSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    request<void>(`/settings/${key}`, put(value)),
};
