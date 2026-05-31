/**
 * Reactive driver lists from the local DB (offline-first).
 *
 * `useDrivers` returns every driver. `useAssignableDrivers` returns the drivers the current
 * driver may assign to in decentralized mode: the spec's `can_assign_to` is a single driver-id
 * on the current user's own driver record (CLAUDE.md §"Role & Assignment Mode"), so we resolve
 * that id against the drivers list. Dispatcher "assign to anyone" is handled in M3.
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
  const { driverId } = useRole();

  const me = all.find((d) => d.id === driverId);
  const target = me?.canAssignTo ?? null;
  const drivers = target != null ? all.filter((d) => d.id === target) : [];

  return { drivers, canAssign: drivers.length > 0 };
}
