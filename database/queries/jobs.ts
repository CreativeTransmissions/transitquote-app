/**
 * Job read/write queries against the local DB. Read queries return Drizzle builders for
 * `useLiveQuery` (reactive). Writes are synchronous transactions (expo-sqlite).
 */
import { desc, eq, notInArray } from 'drizzle-orm';
import { db } from '../client';
import { jobs, jobDetails, type JobInsert, type JobDetailRow } from '../schema';

/** Reactive: all jobs, newest first. */
export function jobsListQuery() {
  return db.select().from(jobs).orderBy(desc(jobs.modified));
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
 */
export function replaceJobs(rows: JobInsert[]): void {
  db.transaction((tx) => {
    const ids = rows.map((r) => r.id).filter((id): id is number => id != null);
    if (ids.length) {
      tx.delete(jobDetails).where(notInArray(jobDetails.jobId, ids)).run();
      tx.delete(jobs).where(notInArray(jobs.id, ids)).run();
    } else {
      tx.delete(jobDetails).run();
      tx.delete(jobs).run();
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

/** Upsert a job + its hydrated detail (from GET /jobs?id=). */
export function upsertJobWithDetail(job: JobInsert, detail: JobDetailRow): void {
  db.transaction((tx) => {
    tx.insert(jobs).values(job).onConflictDoUpdate({ target: jobs.id, set: job }).run();
    tx.insert(jobDetails).values(detail).onConflictDoUpdate({ target: jobDetails.jobId, set: detail }).run();
  });
}
