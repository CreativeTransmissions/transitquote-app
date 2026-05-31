/**
 * Pure job-change detection for polling-based local notifications (spec §10 Option B).
 *
 * The sync cycle pulls the job list; this diffs the previous local snapshot against the freshly
 * pulled rows and produces the notification events the user should see. Kept pure (no I/O, no
 * expo-notifications) so it's fully unit-testable — the actual presentation is a thin seam in
 * services/notifications/notifier.ts.
 *
 * Event rules (by role):
 *  - driver:     a job that became assigned to *me* (new, or reassigned to me)        → 'assigned'
 *                a job already mine whose status changed                              → 'status'
 *  - dispatcher: a job id not seen before                                             → 'new_job'
 *                any job whose status changed                                         → 'status'
 */
import type { JobRow } from '../schema';
import type { RoleType } from '../../types/app';

export type JobChangeType = 'assigned' | 'status' | 'new_job';

export interface JobChangeEvent {
  type: JobChangeType;
  jobId: number;
  jobRef: string;
  title: string;
  body: string;
}

export interface ChangeContext {
  role: RoleType | null;
  /** The current user's driver id (null if the user has no driver record). */
  driverId: number | null;
}

export function detectJobChanges(prev: JobRow[], next: JobRow[], ctx: ChangeContext): JobChangeEvent[] {
  const prevById = new Map(prev.map((j) => [j.id, j]));
  const isDriver = ctx.role === 'driver';
  const isDispatcher = ctx.role === 'dispatch' || ctx.role === 'administrator';
  const events: JobChangeEvent[] = [];

  for (const job of next) {
    const before = prevById.get(job.id);
    const ref = job.jobRef || `#${job.id}`;

    if (isDriver && ctx.driverId != null) {
      const mineNow = job.driverId === ctx.driverId;
      const mineBefore = before?.driverId === ctx.driverId;
      if (mineNow && !mineBefore) {
        events.push({ type: 'assigned', jobId: job.id, jobRef: ref, title: 'New job assigned', body: `Job ${ref} was assigned to you.` });
        continue; // a newly-assigned job doesn't also fire a status event
      }
      if (mineNow && before && before.statusTypeId !== job.statusTypeId) {
        events.push({ type: 'status', jobId: job.id, jobRef: ref, title: 'Job status updated', body: `Job ${ref} is now ${job.statusName ?? 'updated'}.` });
      }
    } else if (isDispatcher) {
      if (!before) {
        events.push({ type: 'new_job', jobId: job.id, jobRef: ref, title: 'New job', body: `Job ${ref} has come in.` });
        continue;
      }
      if (before.statusTypeId !== job.statusTypeId) {
        events.push({ type: 'status', jobId: job.id, jobRef: ref, title: 'Job status updated', body: `Job ${ref} is now ${job.statusName ?? 'updated'}.` });
      }
    }
  }

  return events;
}
