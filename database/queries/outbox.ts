/**
 * Outbox queue queries (offline writes). Pending/in_progress items are flushed by the
 * outboxFlusher; failed items are surfaced to the user for retry/discard. Synchronous (expo-sqlite).
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import {
  outbox,
  type OutboxRow,
  type OutboxActionType,
  type OutboxActionPayload,
} from '../schema';

export function enqueueAction(actionType: OutboxActionType, payload: OutboxActionPayload): void {
  db.insert(outbox)
    .values({ actionType, payload, status: 'pending', attempts: 0, createdAt: new Date().toISOString() })
    .run();
}

/** Items eligible for a flush attempt: pending, plus in_progress left over from an interrupted run. */
export function getProcessable(): OutboxRow[] {
  return db.select().from(outbox).where(inArray(outbox.status, ['pending', 'in_progress'])).all();
}

/** Reactive: the whole outbox (UI derives pending count + failed items). */
export function outboxQuery() {
  return db.select().from(outbox);
}

export function markInProgress(id: number): void {
  db.update(outbox).set({ status: 'in_progress' }).where(eq(outbox.id, id)).run();
}

/** On success, drop the item (synced items aren't kept). */
export function removeOutboxItem(id: number): void {
  db.delete(outbox).where(eq(outbox.id, id)).run();
}

export function markFailed(id: number, error: string): void {
  db.update(outbox).set({ status: 'failed', lastError: error }).where(eq(outbox.id, id)).run();
}

export function markPendingRetry(id: number, error: string, attempts: number): void {
  db.update(outbox).set({ status: 'pending', lastError: error, attempts }).where(eq(outbox.id, id)).run();
}

/** User action: re-queue a failed item. */
export function retryOutboxItem(id: number): void {
  db.update(outbox).set({ status: 'pending', lastError: null, attempts: 0 }).where(eq(outbox.id, id)).run();
}

/** User action: discard a failed item (the next pull will overwrite the optimistic value). */
export function discardOutboxItem(id: number): void {
  db.delete(outbox).where(eq(outbox.id, id)).run();
}
