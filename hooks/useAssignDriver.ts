/**
 * Driver assignment (offline-first write): applies an optimistic local change, queues the action
 * in the outbox, then attempts a flush. Offline, the change stays queued and syncs on reconnect.
 * Used for both "claim" (assign to self) and "assign to another driver" (decentralized, US-012/US-019).
 *
 * NOTE: `update_assigned` is sent form-encoded and `driver_id` must be a `drivers.id` — both are
 * handled in services/api/jobs.ts (docs/API_NOTES.md §10). A server rejection (4xx / success:false)
 * surfaces on the job as a failed outbox item; it is not retried.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { queueAssignment } from '../database/queries/writeActions';
import { flushOutbox } from '../database/sync/outboxFlusher';

export interface AssignDriverVars {
  jobId: number;
  driverId: number;
  driverName: string | null;
}

export function useAssignDriver(): UseMutationResult<void, Error, AssignDriverVars> {
  return useMutation<void, Error, AssignDriverVars>({
    mutationFn: async ({ jobId, driverId, driverName }) => {
      queueAssignment(jobId, driverId, driverName); // optimistic write + outbox enqueue (atomic)
      await flushOutbox(); // best-effort; offline leaves the item pending for the next sync
    },
  });
}
