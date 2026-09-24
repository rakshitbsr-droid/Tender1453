import { UserProfile } from '../types';

// Users and tenders are served by the .NET backend (backend/TenderTracker.Api, seed JSON in Data/Seed).
// USERS is filled once from GET /api/users by App before any view renders, so components can keep
// reading it synchronously.
export const USERS: UserProfile[] = [];

export function setUsers(users: UserProfile[]): void {
  USERS.splice(0, USERS.length, ...users);
}

export const ORDERED_STAGES = [
  'PR Received',
  'Under Estimation',
  'BQC Preparation',
  'To be Floated',
  'Under Bidding',
  'Under BQC / Tech Evaluation',
  'Under Award TEC',
  'Under Negotiation',
  'Awarded',
] as const;
