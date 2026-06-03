/**
 * Job read/write queries against the local DB. Read queries return Drizzle builders for
 * `useLiveQuery` (reactive). Writes are synchronous transactions (expo-sqlite).
 */
import { desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../client';
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

/** Optimistic local status change (applied immediately; reconciled by the next pull). */
export function applyOptimisticStatus(jobId: number, statusTypeId: number, statusName: string | null): void {
  db.update(jobs)
    .set({ statusTypeId, statusName, modified: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();
}

/** Optimistic local assignment change (applied immediately; reconciled by the next pull). */
export function applyOptimisticAssignment(jobId: number, driverId: number, driverName: string | null): void {
  db.update(jobs)
    .set({ driverId, driverName, modified: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();
}

/** Upsert a job + its hydrated detail (from GET /jobs?id=). */
export function upsertJobWithDetail(job: JobInsert, detail: JobDetailRow): void {
  db.transaction((tx) => {
    tx.insert(jobs).values(job).onConflictDoUpdate({ target: jobs.id, set: job }).run();
    tx.insert(jobDetails).values(detail).onConflictDoUpdate({ target: jobDetails.jobId, set: detail }).run();
  });
}
