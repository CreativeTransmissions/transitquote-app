/**
 * Outbox flush (spec §11.5). Walks processable items and submits each to the API:
 *  - success            → remove the item
 *  - permanent (4xx / 200+success:false) → mark failed, no retry (surface to user)
 *  - transient (network / 5xx) → leave pending, increment attempts; fail after MAX_RETRY_ATTEMPTS
 * Items are processed sequentially to preserve order. Never throws — outcomes are recorded in the DB.
 */
import { updateJobStatus, updateAssigned } from '../../services/api/jobs';
import { getApiErrorMessage, isPermanentFailure } from '../../services/apiError';
import {
  getProcessable,
  markInProgress,
  removeOutboxItem,
  markFailed,
  markPendingRetry,
} from '../queries/outbox';
import { MAX_RETRY_ATTEMPTS } from '../../constants';
import type { OutboxRow } from '../schema';

async function dispatchAction(row: OutboxRow): Promise<void> {
  const { id, status_type_id, driver_id } = row.payload;
  switch (row.actionType) {
    case 'UPDATE_STATUS':
      if (status_type_id == null) throw new Error('Missing status_type_id');
      await updateJobStatus({ id, status_type_id });
      return;
    case 'ASSIGN_DRIVER':
      if (driver_id == null) throw new Error('Missing driver_id');
      await updateAssigned({ id, driver_id });
      return;
    default:
      throw new Error(`Unknown outbox action: ${String(row.actionType)}`);
  }
}

async function flushOnce(): Promise<void> {
  const items = getProcessable();
  for (const row of items) {
    markInProgress(row.id);
    try {
      await dispatchAction(row);
      removeOutboxItem(row.id);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (isPermanentFailure(error)) {
        markFailed(row.id, message);
      } else {
        const attempts = row.attempts + 1;
        if (attempts >= MAX_RETRY_ATTEMPTS) markFailed(row.id, message);
        else markPendingRetry(row.id, message, attempts);
      }
    }
  }
}

// Single-flight guard. flushOutbox is fired from several independent callers (foreground sync,
// pull-to-refresh, connectivity-restore, after every write, manual retry). Without this, two
// overlapping flushes both read the same `pending` rows via getProcessable() before either marks
// them in_progress, and each `await dispatchAction(row)` — submitting non-idempotent actions
// (e.g. ASSIGN_DRIVER) to the server twice. We coalesce concurrent calls onto the active run and,
// if a caller asks again mid-flush, do exactly one more pass so items enqueued during the flush
// (or freshly-pending retries) are still picked up without a separate trigger.
let active: Promise<void> | null = null;
let rerunRequested = false;

export function flushOutbox(): Promise<void> {
  if (active) {
    rerunRequested = true;
    return active;
  }
  active = (async () => {
    try {
      do {
        rerunRequested = false;
        await flushOnce();
      } while (rerunRequested);
    } finally {
      active = null;
    }
  })();
  return active;
}
