/**
 * Pull-side sync: fetch from the API, map, and write to the local DB. The UI never reads from
 * the API directly — it reads the DB (offline-first) and these functions keep the DB fresh.
 *
 * The push side lives in `outboxFlusher.ts`; `useSyncJobs` runs flush-then-pull so queued local
 * writes go up before fresh data comes down. Conflict resolution is server-wins by construction:
 * `replaceJobs` overwrites local rows with the pulled server state.
 */
import { getJobs, getJobDetail } from '../../services/api/jobs';
import { getCustomers } from '../../services/api/customers';
import { mapJob, mapJobDetail, mapCustomer } from '../mappers';
import { getAllJobs, replaceJobs, upsertJobWithDetail } from '../queries/jobs';
import { replaceCustomers } from '../queries/customers';
import { getCurrentUserRow } from '../queries/configuration';
import { setLastSynced } from '../queries/syncMeta';
import { detectJobChanges } from './changeDetector';
import { presentJobNotifications } from '../../services/notifications/notifier';
import { resolveRole } from '../../utils/roleGuards';

/**
 * Pull the job list and reconcile it into the local DB. Before overwriting, snapshot the existing
 * rows and diff them against the incoming set to fire local notifications (spec §10 Option B).
 */
export async function pullJobs(): Promise<void> {
  const list = await getJobs();
  const next = list.map(mapJob);

  // Diff against the current snapshot for notifications, then reconcile (server-wins).
  const prev = getAllJobs();
  replaceJobs(next);
  setLastSynced('jobs', new Date().toISOString());

  const user = getCurrentUserRow();
  if (user) {
    const events = detectJobChanges(prev, getAllJobs(), {
      role: resolveRole(user.roles ?? []),
      driverId: user.driverId ?? null,
    });
    if (events.length) presentJobNotifications(events);
  }
}

/** Pull one job's full detail and upsert it (list never carries nested data). */
export async function pullJobDetail(id: number): Promise<void> {
  const detail = await getJobDetail(id);
  const mapped = mapJobDetail(detail, new Date().toISOString());
  upsertJobWithDetail(mapped.job, mapped.detail);
}

/** Pull the customers list and reconcile it into the local DB (dispatcher/admin — spec §6.8). */
export async function pullCustomers(): Promise<void> {
  const list = await getCustomers();
  replaceCustomers(list.map(mapCustomer));
  setLastSynced('customers', new Date().toISOString());
}
