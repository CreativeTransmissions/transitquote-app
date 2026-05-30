import type { RoleType } from '../types/app';

// Role is derived ONLY from the roles array returned by the API (spec §13, CLAUDE.md §4).
// Display names (e.g. the configured driver role name) are NEVER used for access control.
const DISPATCH_ROLES = ['dispatch', 'administrator'];

export function resolveRole(roles: string[]): RoleType {
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.includes('administrator')) return 'administrator';
  if (lower.includes('dispatch')) return 'dispatch';
  return 'driver';
}

export function isDispatcher(roles: string[]): boolean {
  return roles.map((r) => r.toLowerCase()).some((r) => DISPATCH_ROLES.includes(r));
}

export function isDriver(roles: string[]): boolean {
  return resolveRole(roles) === 'driver';
}

// Decentralized assignment: a driver may assign to another driver only when the target id
// is present in the allowed list. Server also enforces this — client guards UX only.
export function canAssignTo(allowedDriverIds: number[], targetDriverId: number): boolean {
  return allowedDriverIds.includes(targetDriverId);
}
