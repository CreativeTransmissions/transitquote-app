/**
 * Integration tests for the outbox queue queries against a real (in-memory) SQLite database.
 * Covers enqueue, the processable filter + FIFO ordering, the pending-mutation lookup the sync
 * engine uses to protect optimistic writes, and every status transition (in_progress / failed /
 * pending-retry / retry / discard / remove).
 */
import { db, resetTestDb } from '../../testkit/sqliteClient';
import {
  enqueueAction,
  getProcessable,
  getPendingJobMutations,
  outboxQuery,
  markInProgress,
  removeOutboxItem,
  markFailed,
  markPendingRetry,
  retryOutboxItem,
  discardOutboxItem,
} from '../outbox';
import { outbox } from '../../schema';

jest.mock('../../client');

beforeEach(() => resetTestDb());

describe('enqueueAction + getProcessable', () => {
  it('enqueues a pending item with zeroed attempts', () => {
    enqueueAction('UPDATE_STATUS', { id: 1, status_type_id: 5 });
    const [row] = getProcessable();
    expect(row).toMatchObject({ actionType: 'UPDATE_STATUS', status: 'pending', attempts: 0 });
    expect(row.payload).toEqual({ id: 1, status_type_id: 5 });
  });

  it('returns pending AND in_progress items, but not failed/synced', () => {
    enqueueAction('UPDATE_STATUS', { id: 1, status_type_id: 5 }); // id 1 — stays pending
    enqueueAction('ASSIGN_DRIVER', { id: 2, driver_id: 7 }); // id 2 — will go in_progress
    enqueueAction('UPDATE_STATUS', { id: 3, status_type_id: 2 }); // id 3 — will fail
    markInProgress(2, 1);
    markFailed(3, 'rejected');

    expect(getProcessable().map((r) => r.id)).toEqual([1, 2]);
  });

  it('orders processable items FIFO by insertion id', () => {
    enqueueAction('ASSIGN_DRIVER', { id: 50, driver_id: 7 });
    enqueueAction('UPDATE_STATUS', { id: 50, status_type_id: 5 });
    expect(getProcessable().map((r) => r.actionType)).toEqual(['ASSIGN_DRIVER', 'UPDATE_STATUS']);
  });
});

describe('getPendingJobMutations', () => {
  it('reports job id + action for un-synced items only', () => {
    enqueueAction('UPDATE_STATUS', { id: 11, status_type_id: 5 });
    enqueueAction('ASSIGN_DRIVER', { id: 22, driver_id: 7 });
    enqueueAction('UPDATE_STATUS', { id: 33, status_type_id: 2 });
    markFailed(3, 'rejected'); // job 33 — excluded once failed

    expect(getPendingJobMutations().sort((a, b) => a.jobId - b.jobId)).toEqual([
      { jobId: 11, actionType: 'UPDATE_STATUS' },
      { jobId: 22, actionType: 'ASSIGN_DRIVER' },
    ]);
  });
});

describe('status transitions', () => {
  beforeEach(() => enqueueAction('ASSIGN_DRIVER', { id: 100, driver_id: 7 })); // id 1

  it('markInProgress sets status + persists the attempt count', () => {
    markInProgress(1, 3);
    const [row] = db.select().from(outbox).all();
    expect(row).toMatchObject({ status: 'in_progress', attempts: 3 });
  });

  it('removeOutboxItem deletes a synced item', () => {
    removeOutboxItem(1);
    expect(db.select().from(outbox).all()).toHaveLength(0);
  });

  it('markFailed records status + error and stops it being processable', () => {
    markFailed(1, 'Driver cannot be assigned');
    const [row] = db.select().from(outbox).all();
    expect(row).toMatchObject({ status: 'failed', lastError: 'Driver cannot be assigned' });
    expect(getProcessable()).toHaveLength(0);
  });

  it('markPendingRetry keeps it processable with the bumped attempt count + error', () => {
    markPendingRetry(1, 'Network request failed', 2);
    const [row] = getProcessable();
    expect(row).toMatchObject({ status: 'pending', attempts: 2, lastError: 'Network request failed' });
  });

  it('retryOutboxItem re-queues a failed item with cleared error + attempts', () => {
    markFailed(1, 'rejected');
    retryOutboxItem(1);
    const [row] = getProcessable();
    expect(row).toMatchObject({ status: 'pending', attempts: 0, lastError: null });
  });

  it('discardOutboxItem removes a failed item', () => {
    markFailed(1, 'rejected');
    discardOutboxItem(1);
    expect(db.select().from(outbox).all()).toHaveLength(0);
  });

  it('outboxQuery exposes the whole queue (incl. failed) for the UI', () => {
    markFailed(1, 'rejected');
    expect(outboxQuery().all()).toHaveLength(1);
  });
});
