/**
 * Protect un-synced optimistic writes from being clobbered by a server pull.
 *
 * Sync is server-wins by construction: `replaceJobs` overwrites local rows with the pulled state.
 * That is correct only for rows with no in-flight local intent. A row whose status/assignment
 * change is still queued in the outbox (pending or in_progress) would otherwise be reverted to the
 * server's stale value on the very next pull — the user watches their update "disappear" even
 * though it will still be retried. We overlay the optimistic columns back onto the pulled rows for
 * exactly those jobs, scoped to the columns each action type touches:
 *   - UPDATE_STATUS  → statusTypeId, statusName
 *   - ASSIGN_DRIVER  → driverId, driverName
 *
 * Pure (no DB) so it is unit-testable in isolation.
 */
import type { JobInsert, JobRow, OutboxActionType } from '../schema';

export interface PendingJobMutation {
  jobId: number;
  actionType: OutboxActionType;
}

export function reconcileOptimistic(
  next: JobInsert[],
  prevById: Map<number, JobRow>,
  pending: PendingJobMutation[],
): JobInsert[] {
  if (pending.length === 0) return next;

  const actionsByJob = new Map<number, Set<OutboxActionType>>();
  for (const { jobId, actionType } of pending) {
    const set = actionsByJob.get(jobId) ?? new Set<OutboxActionType>();
    set.add(actionType);
    actionsByJob.set(jobId, set);
  }

  return next.map((row) => {
    if (row.id == null) return row;
    const actions = actionsByJob.get(row.id);
    if (!actions) return row;
    const local = prevById.get(row.id);
    if (!local) return row; // no local row to preserve (e.g. first sight of the job)

    const merged: JobInsert = { ...row };
    if (actions.has('UPDATE_STATUS')) {
      merged.statusTypeId = local.statusTypeId;
      merged.statusName = local.statusName;
    }
    if (actions.has('ASSIGN_DRIVER')) {
      merged.driverId = local.driverId;
      merged.driverName = local.driverName;
    }
    return merged;
  });
}
