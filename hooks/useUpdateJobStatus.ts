/**
 * Status update (offline-first write): applies an optimistic local change, queues the action in
 * the outbox, then attempts a flush. Offline, the change stays queued and syncs on reconnect.
 * The UI reflects the optimistic value immediately via the reactive job query.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { queueStatusUpdate } from '../database/queries/writeActions';
import { flushOutbox } from '../database/sync/outboxFlusher';

export interface UpdateStatusVars {
  jobId: number;
  statusTypeId: number;
  statusName: string | null;
}

export function useUpdateJobStatus(): UseMutationResult<void, Error, UpdateStatusVars> {
  return useMutation<void, Error, UpdateStatusVars>({
    mutationFn: async ({ jobId, statusTypeId, statusName }) => {
      queueStatusUpdate(jobId, statusTypeId, statusName); // optimistic write + outbox enqueue (atomic)
      await flushOutbox(); // best-effort; offline leaves the item pending for the next sync
    },
  });
}
