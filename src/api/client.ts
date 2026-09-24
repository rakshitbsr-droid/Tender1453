import { Tender, TenderStage, UserProfile, UserRole } from '../types';

// In development requests go to /api on the Vite dev server, which proxies them to the .NET backend
// (see vite.config.ts). A hosted build sets VITE_API_BASE to the API's public URL, e.g.
// https://tender-tracker-api.onrender.com/api (see README.md, "Deploy").
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

export interface AdvanceStagePayload {
  next_stage: TenderStage;
  next_holder: string;
  next_role: UserRole;
  remarks: string;
  awarded_value?: number;
  savings?: number;
  handoff_timestamp?: string;
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

  return res.json() as Promise<T>;
}

export const api = {
  getUsers: () => request<UserProfile[]>('/users'),
  getTenders: () => request<Tender[]>('/tenders'),
  createTender: (tender: Tender) =>
    request<Tender>('/tenders', { method: 'POST', body: JSON.stringify(tender) }),
  advanceStage: (srNo: number, payload: AdvanceStagePayload) =>
    request<Tender>(`/tenders/${srNo}/advance`, { method: 'POST', body: JSON.stringify(payload) }),
};
