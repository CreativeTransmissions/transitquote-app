/**
 * Offline-first writes that must be atomic: the optimistic local change AND the outbox entry that
 * will sync it have to commit together. If they don't, a failure between them leaves the local row
 * diverged from the server with no queued action to reconcile it (the change would only be undone
 * by the next full pull). Batching both in one db.transaction (CLAUDE.md §6) makes them all-or-nothing.
 */
import { db } from '../client';
import { applyOptimisticStatus, applyOptimisticAssignment } from './jobs';
import { enqueueAction } from './outbox';

export function queueStatusUpdate(jobId: number, statusTypeId: number, statusName: string | null): void {
  db.transaction((tx) => {
    applyOptimisticStatus(jobId, statusTypeId, statusName, tx);
    enqueueAction('UPDATE_STATUS', { id: jobId, status_type_id: statusTypeId }, tx);
  });
}

export function queueAssignment(jobId: number, driverId: number, driverName: string | null): void {
  db.transaction((tx) => {
    applyOptimisticAssignment(jobId, driverId, driverName, tx);
    enqueueAction('ASSIGN_DRIVER', { id: jobId, driver_id: driverId }, tx);
  });
}
