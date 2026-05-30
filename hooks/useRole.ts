/**
 * Current user's role + assignment mode, derived reactively from the local DB (offline-first).
 * Role comes from the `roles` array (never display strings — CLAUDE.md §4). Assignment mode
 * comes from team_settings.job_assignment. Returns role: null until configuration is seeded.
 */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../database/client';
import { currentUser, teamSettings } from '../database/schema';
import { resolveRole } from '../utils/roleGuards';
import type { AssignmentMode, RoleType } from '../types/app';

export interface RoleInfo {
  role: RoleType | null;
  roles: string[];
  assignmentMode: AssignmentMode;
  isDriver: boolean;
  isDispatcher: boolean;
  isDecentralized: boolean;
  driverId: number | null;
}

export function useRole(): RoleInfo {
  const { data: users } = useLiveQuery(db.select().from(currentUser).where(eq(currentUser.id, 1)));
  const { data: settings } = useLiveQuery(db.select().from(teamSettings).where(eq(teamSettings.id, 1)));

  const user = users.at(0);
  const roles = user?.roles ?? [];
  const role = user ? resolveRole(roles) : null;
  const assignmentMode: AssignmentMode = settings.at(0)?.assignmentMode ?? 'Centralized';

  return {
    role,
    roles,
    assignmentMode,
    isDriver: role === 'driver',
    isDispatcher: role === 'dispatch' || role === 'administrator',
    isDecentralized: assignmentMode === 'Decentralized',
    driverId: user?.driverId ?? null,
  };
}
