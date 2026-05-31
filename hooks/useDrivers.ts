/**
 * Reactive driver lists from the local DB (offline-first).
 *
 * `useDrivers` returns every driver. `useAssignableDrivers` returns the drivers the current user
 * may assign a job to: dispatchers/admins may assign to anyone (US-032/US-033); decentralized
 * drivers may assign only within their own record's `can_assign_to` (a single driver-id —
 * CLAUDE.md §"Role & Assignment Mode"), resolved against the drivers list.
 */
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { driversListQuery } from '../database/queries/drivers';
import { useRole } from './useRole';
import type { DriverRow } from '../database/schema';

export function useDrivers(): DriverRow[] {
  const { data } = useLiveQuery(driversListQuery());
  return data;
}

export interface AssignableDrivers {
  /** Drivers the current user may assign a job to. */
  drivers: DriverRow[];
  /** Whether the current user can assign to anyone (drives whether the "Assign" affordance shows). */
  canAssign: boolean;
}

export function useAssignableDrivers(): AssignableDrivers {
  const all = useDrivers();
  const { driverId, isDispatcher } = useRole();

  // Dispatchers/admins may assign any job to any driver (US-032/US-033).
  if (isDispatcher) return { drivers: all, canAssign: all.length > 0 };

  // Decentralized drivers may assign only within their own record's can_assign_to.
  const me = all.find((d) => d.id === driverId);
  const target = me?.canAssignTo ?? null;
  const drivers = target != null ? all.filter((d) => d.id === target) : [];

  return { drivers, canAssign: drivers.length > 0 };
}
