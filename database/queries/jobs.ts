/**
 * Job read/write queries against the local DB. Read queries return Drizzle builders for
 * `useLiveQuery` (reactive). Writes are synchronous transactions (expo-sqlite).
 */
import { desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, type DbWriter } from '../client';
import { jobs, jobDetails, type JobInsert, type JobDetailRow, type JobRow } from '../schema';
import { planJobPrune } from './jobPrune';

/** Reactive: all jobs, newest first. */
export function jobsListQuery() {
  return db.select().from(jobs).orderBy(desc(jobs.modified));
}

/** Non-reactive snapshot of every job row — used by the sync engine to diff for notifications. */
export function getAllJobs(): JobRow[] {
  return db.select().from(jobs).all();
}

/** Reactive: unassigned jobs (decentralized "Available" tab), newest first. */
export function availableJobsQuery() {
  return db.select().from(jobs).where(isNull(jobs.driverId)).orderBy(desc(jobs.modified));
}

/** Reactive: jobs assigned to one driver (decentralized "My Jobs" tab), newest first. */
export function myJobsQuery(driverId: number) {
  return db.select().from(jobs).where(eq(jobs.driverId, driverId)).orderBy(desc(jobs.modified));
}

/** Reactive: a single job row by id. */
export function jobByIdQuery(id: number) {
  return db.select().from(jobs).where(eq(jobs.id, id));
}

/** Reactive: a single job's hydrated detail by id. */
export function jobDetailByIdQuery(id: number) {
  return db.select().from(jobDetails).where(eq(jobDetails.jobId, id));
}

/**
 * Replace the jobs table with a freshly pulled list: upsert each present job and prune any that
 * the server no longer returns (and their detail rows). Upserts only touch list-provided columns,
 * so a previously hydrated detail's job fields are preserved where the list omits them.
 *
 * Pruning computes the removed ids in JS and deletes them in bounded chunks (planJobPrune) rather
 * than a `NOT IN (…all surviving ids…)` clause, which would exceed SQLite's variable limit (and
 * crash the whole pull) for tenants with >999 jobs. Surviving jobs' hydrated detail rows are kept.
 */
export function replaceJobs(rows: JobInsert[]): void {
  db.transaction((tx) => {
    const nextIds = rows.map((r) => r.id).filter((id): id is number => id != null);
    const existing = tx.select({ id: jobs.id }).from(jobs).all().map((r) => r.id);
    for (const chunk of planJobPrune(existing, nextIds)) {
      tx.delete(jobDetails).where(inArray(jobDetails.jobId, chunk)).run();
      tx.delete(jobs).where(inArray(jobs.id, chunk)).run();
    }
    for (const row of rows) {
      tx.insert(jobs).values(row).onConflictDoUpdate({ target: jobs.id, set: row }).run();
    }
  });
}

/**
 * Optimistic local status change (applied immediately; reconciled by the next pull). Accepts an
 * executor so it can run standalone (`db`) or inside a transaction (`tx`) alongside the outbox write.
 */
export function applyOptimisticStatus(
  jobId: number,
  statusTypeId: number,
  statusName: string | null,
  exec: DbWriter = db,
): void {
  exec
    .update(jobs)
    .set({ statusTypeId, statusName, modified: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();
}

/** Optimistic local assignment change (applied immediately; reconciled by the next pull). */
export function applyOptimisticAssignment(
  jobId: number,
  driverId: number,
  driverName: string | null,
  exec: DbWriter = db,
): void {
  exec
    .update(jobs)
    .set({ driverId, driverName, modified: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();
}

/**
 * Jobs whose hydrated detail is missing or stale — the work set for bulk detail hydration
 * (spec §11, offline-first). A LEFT JOIN finds jobs with no `job_details` row, or one whose
 * `job_modified_at` no longer matches `jobs.modified` (the server bumped it since we hydrated, or a
 * pre-0005 row with a NULL marker). Up-to-date jobs are excluded → a steady-state sync needing
 * nothing issues zero detail requests.
 *
 * Ordering puts the current user's assigned jobs first (best offline value soonest on big tenants),
 * then the rest by newest `modified`. `driverId` null (dispatcher/admin) keeps the plain order.
 */
export function getJobsNeedingDetail(driverId: number | null = null): { id: number; modified: string | null }[] {
  const rows = db
    .select({
      id: jobs.id,
      modified: jobs.modified,
      driverId: jobs.driverId,
      hydratedModified: jobDetails.jobModifiedAt,
      hasDetail: jobDetails.jobId,
    })
    .from(jobs)
    .leftJoin(jobDetails, eq(jobDetails.jobId, jobs.id))
    .orderBy(desc(jobs.modified))
    .all();

  const needing = rows.filter((r) => r.hasDetail == null || r.hydratedModified !== r.modified);

  // Assigned-first: stable partition that preserves the newest-first order within each group.
  if (driverId != null) {
    const mine = needing.filter((r) => r.driverId === driverId);
    const others = needing.filter((r) => r.driverId !== driverId);
    return [...mine, ...others].map((r) => ({ id: r.id, modified: r.modified }));
  }
  return needing.map((r) => ({ id: r.id, modified: r.modified }));
}

/**
 * Write a job's hydrated detail blob ONLY — never the `jobs` row. This is the reconciliation
 * guarantee for offline-first writes: status/assignment live on `jobs` and are reconciled exactly
 * once, in `pullJobs` (reconcileOptimistic). A detail pull must never overwrite them with the
 * server's stale value while an optimistic outbox mutation is pending. `jobModifiedAt` is the
 * `jobs.modified` captured at hydration time, so the next sync can detect staleness incrementally.
 */
export function upsertJobDetailRow(detail: JobDetailRow, jobModifiedAt: string | null): void {
  const row: JobDetailRow = { ...detail, jobModifiedAt };
  db.insert(jobDetails).values(row).onConflictDoUpdate({ target: jobDetails.jobId, set: row }).run();
}
