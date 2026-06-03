/**
 * Pure pruning plan for replaceJobs — kept DB-free so it is unit-testable.
 *
 * A server pull replaces the local job list. We must delete the jobs the server no longer returns,
 * but doing it with `WHERE id NOT IN (?, ?, …)` binds one parameter per surviving id, which throws
 * once a tenant exceeds SQLite's SQLITE_MAX_VARIABLE_NUMBER (999 on older builds — and that limit
 * differs between the Android and iOS expo-sqlite builds). Instead we compute the *removed* ids in
 * JS (usually a small set) and delete them in bounded chunks, so the bound-parameter count per
 * statement is capped regardless of list size.
 */

// Stay comfortably under the historical 999-variable floor.
export const JOB_PRUNE_CHUNK = 500;

/** Ids present locally but absent from the incoming list, split into delete-able chunks. */
export function planJobPrune(
  existingIds: readonly number[],
  nextIds: Iterable<number>,
  chunkSize: number = JOB_PRUNE_CHUNK,
): number[][] {
  const keep = new Set(nextIds);
  const removed = existingIds.filter((id) => !keep.has(id));
  const chunks: number[][] = [];
  for (let i = 0; i < removed.length; i += chunkSize) {
    chunks.push(removed.slice(i, i + chunkSize));
  }
  return chunks;
}
