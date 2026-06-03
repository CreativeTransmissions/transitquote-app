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
import { getPendingJobMutations } from '../queries/outbox';
import { getLastSynced, setLastSynced } from '../queries/syncMeta';
import { detectJobChanges } from './changeDetector';
import { reconcileOptimistic } from './reconcileOptimistic';
import { presentJobNotifications } from '../../services/notifications/notifier';
import { resolveRole } from '../../utils/roleGuards';

/**
 * Pull the job list and reconcile it into the local DB. Before overwriting, snapshot the existing
 * rows and diff them against the incoming set to fire local notifications (spec §10 Option B).
 */
export async function pullJobs(signal?: AbortSignal): Promise<void> {
  const list = await getJobs(signal);
  const next = list.map(mapJob);

  // The first sync after login/clear establishes the baseline; every existing job would otherwise
  // diff as "new" and fire a storm of notifications. Only notify against an existing baseline.
  const isBaselineSync = getLastSynced('jobs') == null;

  // Diff against the current snapshot for notifications, then reconcile (server-wins) — except
  // for jobs whose status/assignment change is still queued in the outbox: those keep their
  // optimistic value so the pull doesn't visibly revert an action that hasn't synced yet.
  const prev = getAllJobs();
  const prevById = new Map(prev.map((j) => [j.id, j]));
  const reconciled = reconcileOptimistic(next, prevById, getPendingJobMutations());
  replaceJobs(reconciled);
  setLastSynced('jobs', new Date().toISOString());

  if (isBaselineSync) return;

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
  if (!Number.isFinite(id)) return; // e.g. Number(badRouteParam) === NaN — don't hit the API
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
