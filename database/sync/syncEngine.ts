/**
 * Pull-side sync: fetch from the API, map, and write to the local DB. The UI never reads from
 * the API directly — it reads the DB (offline-first) and these functions keep the DB fresh.
 *
 * The push side lives in `outboxFlusher.ts`; `useSyncJobs` runs flush-then-pull so queued local
 * writes go up before fresh data comes down. Conflict resolution is server-wins by construction:
 * `replaceJobs` overwrites local rows with the pulled server state.
 */
import { getJobs, getJobDetail } from '../../services/api/jobs';
import { mapJob, mapJobDetail } from '../mappers';
import { replaceJobs, upsertJobWithDetail } from '../queries/jobs';
import { setLastSynced } from '../queries/syncMeta';

/** Pull the job list and reconcile it into the local DB. */
export async function pullJobs(): Promise<void> {
  const list = await getJobs();
  replaceJobs(list.map(mapJob));
  setLastSynced('jobs', new Date().toISOString());
}

/** Pull one job's full detail and upsert it (list never carries nested data). */
export async function pullJobDetail(id: number): Promise<void> {
  const detail = await getJobDetail(id);
  const mapped = mapJobDetail(detail, new Date().toISOString());
  upsertJobWithDetail(mapped.job, mapped.detail);
}
