/**
 * Reactive outbox state for the UI: total pending count (sync badge) and failed items
 * (surfaced on the affected job for retry/discard). Also exposes per-job lookup helpers.
 */
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { outboxQuery } from '../database/queries/outbox';
import type { OutboxRow } from '../database/schema';

export type JobOutboxState = 'pending' | 'failed';

export interface UseOutboxResult {
  items: OutboxRow[];
  pendingCount: number;
  failed: OutboxRow[];
  /** Map of job id → its most relevant outbox state (failed takes precedence over pending). */
  stateByJob: Map<number, JobOutboxState>;
}

export function useOutbox(): UseOutboxResult {
  const { data } = useLiveQuery(outboxQuery());

  const stateByJob = new Map<number, JobOutboxState>();
  let pendingCount = 0;
  const failed: OutboxRow[] = [];

  for (const item of data) {
    const jobId = item.payload.id;
    if (item.status === 'failed') {
      stateByJob.set(jobId, 'failed');
      failed.push(item);
    } else if (item.status === 'pending' || item.status === 'in_progress') {
      pendingCount += 1;
      if (stateByJob.get(jobId) !== 'failed') stateByJob.set(jobId, 'pending');
    }
  }

  return { items: data, pendingCount, failed, stateByJob };
}
