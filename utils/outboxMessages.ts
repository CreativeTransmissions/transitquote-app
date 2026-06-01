/**
 * Plain-language descriptions for failed outbox items, surfaced when the user taps the
 * "failed" sync badge (SyncProblemsSheet). Pure + unit-tested — no UI, no I/O.
 */
import type { OutboxRow } from '../database/schema';

/** What the user was trying to do — used as the problem's title. */
export function describeOutboxAction(actionType: OutboxRow['actionType']): string {
  switch (actionType) {
    case 'ASSIGN_DRIVER':
      return 'Couldn’t assign driver';
    case 'UPDATE_STATUS':
      return 'Couldn’t update status';
    default:
      return 'Couldn’t sync a change';
  }
}

/** Translate a raw outbox error into a plain-language explanation of what went wrong. */
export function explainOutboxError(lastError: string | null): string {
  if (!lastError) return 'The server rejected this change, so it wasn’t saved.';
  const e = lastError.toLowerCase();
  if (e.includes('network') || e.includes('timeout') || e.includes('econn') || e.includes('reach')) {
    return 'The app couldn’t reach the server, so the change wasn’t saved. Check your connection and retry.';
  }
  // A 4xx / permission / validation rejection — the server's own message explains it best.
  return lastError;
}
