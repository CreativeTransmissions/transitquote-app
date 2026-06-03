/**
 * Pull-side sync: fetch from the API, map, and write to the local DB. The UI never reads from
 * the API directly — it reads the DB (offline-first) and these functions keep the DB fresh.
 *
 * The push side lives in `outboxFlusher.ts`; `useSyncJobs` runs flush-then-pull so queued local
 * writes go up before fresh data comes down. Conflict resolution is server-wins by construction:
 * `replaceJobs` overwrites local rows with the pulled server state.
 */
import { isCancel } from 'axios';
import { getJobs, getJobDetail } from '../../services/api/jobs';
import { getCustomers } from '../../services/api/customers';
import { mapJob, mapJobDetail, mapCustomer } from '../mappers';
import { getAllJobs, replaceJobs, getJobsNeedingDetail, upsertJobDetailRow } from '../queries/jobs';
import { replaceCustomers } from '../queries/customers';
import { getCurrentUserRow } from '../queries/configuration';
import { getPendingJobMutations } from '../queries/outbox';
import { getLastSynced, setLastSynced } from '../queries/syncMeta';
import { detectJobChanges } from './changeDetector';
import { reconcileOptimistic } from './reconcileOptimistic';
import { presentJobNotifications } from '../../services/notifications/notifier';
import { resolveRole } from '../../utils/roleGuards';
import { DETAIL_HYDRATION_CONCURRENCY, MAX_DETAIL_HYDRATION } from '../../constants';

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

/**
 * Pull one job's full detail and persist the blob (list never carries nested data). Writes the
 * `job_details` row ONLY — never the `jobs` row — so a per-screen refresh can't revert an optimistic
 * status/assignment that's still queued in the outbox (that row is reconciled solely by `pullJobs`).
 */
export async function pullJobDetail(id: number, signal?: AbortSignal): Promise<void> {
  if (!Number.isFinite(id)) return; // e.g. Number(badRouteParam) === NaN — don't hit the API
  const detail = await getJobDetail(id, signal);
  const mapped = mapJobDetail(detail, new Date().toISOString());
  upsertJobDetailRow(mapped.detail, mapped.job.modified ?? null);
}

/**
 * Bulk-hydrate the detail of every job that needs it, so opening ANY job offline shows full detail
 * — not just jobs the user happened to open online (spec §11, offline-first; see
 * docs/proposals/offline-bulk-detail-hydration.md). Runs AFTER `pullJobs` so the full id set and
 * each job's `modified` are known. Properties:
 *   - Incremental: only missing/stale jobs are fetched (steady state ⇒ zero requests).
 *   - Bounded concurrency: a fixed worker pool over the work set (DETAIL_HYDRATION_CONCURRENCY).
 *   - Partial-failure tolerant: one job's detail failing logs and continues; it stays "needing
 *     detail" (its `job_modified_at` is untouched) and is retried next sync.
 *   - Abortable: a user Cancel aborts in-flight requests; whatever was fetched stays persisted.
 *   - Detail-only writes: never touches `jobs` status/assignment, so optimistic writes survive.
 */
export async function hydrateJobDetails(
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const driverId = getCurrentUserRow()?.driverId ?? null;
  const work = getJobsNeedingDetail(driverId);

  // Optional ceiling for pathological tenants — log when applied (no silent caps).
  const capped =
    MAX_DETAIL_HYDRATION > 0 && work.length > MAX_DETAIL_HYDRATION
      ? work.slice(0, MAX_DETAIL_HYDRATION)
      : work;
  if (capped.length < work.length) {
    console.warn(`[sync] detail hydration capped at ${capped.length}/${work.length} jobs this run`);
  }

  const total = capped.length;
  let done = 0;
  onProgress?.(done, total);
  if (total === 0) return;

  // Bounded worker pool over a shared cursor — each worker pulls the next id until the list is drained.
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (!signal?.aborted) {
      const index = cursor++;
      if (index >= total) return;
      const { id, modified } = capped[index];
      try {
        const detail = await getJobDetail(id, signal);
        const mapped = mapJobDetail(detail, new Date().toISOString());
        upsertJobDetailRow(mapped.detail, modified);
      } catch (e) {
        if (isCancel(e)) return; // aborted mid-flight — stop quietly, leave the job "needing detail"
        // One bad detail (e.g. a wpdberror on ?id=) must not fail the whole run — log and continue.
        console.warn(`[sync] detail hydration failed for job ${id}`, e);
      } finally {
        done += 1;
        onProgress?.(done, total);
      }
    }
  };

  const poolSize = Math.min(DETAIL_HYDRATION_CONCURRENCY, total);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
}

/** Pull the customers list and reconcile it into the local DB (dispatcher/admin — spec §6.8). */
export async function pullCustomers(): Promise<void> {
  const list = await getCustomers();
  replaceCustomers(list.map(mapCustomer));
  setLastSynced('customers', new Date().toISOString());
}
