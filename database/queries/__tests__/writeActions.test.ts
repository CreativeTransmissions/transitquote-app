/**
 * Atomicity tests for the offline write actions. The optimistic local change AND the outbox entry
 * that will sync it must commit together: if they don't, a failure between them leaves the local
 * row diverged from the server with no queued action to reconcile it. These tests prove the
 * db.transaction wrapping makes both writes all-or-nothing — including rollback on failure.
 */
import { db, resetTestDb } from '../../testkit/sqliteClient';
import { queueStatusUpdate, queueAssignment } from '../writeActions';
import * as outboxQueries from '../outbox';
import { jobs, outbox, type JobInsert } from '../../schema';

jest.mock('../../client');

function seedJob(overrides: Partial<JobInsert> = {}): void {
  db.insert(jobs)
    .values({ id: 1, jobRef: 'JOB-1', statusTypeId: 1, statusName: 'Booked', driverId: null, ...overrides })
    .run();
}

beforeEach(() => resetTestDb());

describe('queueStatusUpdate', () => {
  it('applies the optimistic status AND enqueues the outbox action together', () => {
    seedJob();
    queueStatusUpdate(1, 5, 'Delivered');

    const [job] = db.select().from(jobs).all();
    expect(job).toMatchObject({ statusTypeId: 5, statusName: 'Delivered' });

    const [item] = db.select().from(outbox).all();
    expect(item).toMatchObject({ actionType: 'UPDATE_STATUS', status: 'pending' });
    expect(item.payload).toEqual({ id: 1, status_type_id: 5 });
  });
});

describe('queueAssignment', () => {
  it('applies the optimistic assignment AND enqueues the outbox action together', () => {
    seedJob();
    queueAssignment(1, 42, 'Pat Driver');

    const [job] = db.select().from(jobs).all();
    expect(job).toMatchObject({ driverId: 42, driverName: 'Pat Driver' });

    const [item] = db.select().from(outbox).all();
    expect(item).toMatchObject({ actionType: 'ASSIGN_DRIVER', status: 'pending' });
    expect(item.payload).toEqual({ id: 1, driver_id: 42 });
  });
});

describe('atomicity — rollback on failure', () => {
  it('rolls back the optimistic status change if the outbox enqueue throws', () => {
    seedJob({ statusTypeId: 1, statusName: 'Booked' });
    const spy = jest.spyOn(outboxQueries, 'enqueueAction').mockImplementation(() => {
      throw new Error('enqueue blew up mid-transaction');
    });

    expect(() => queueStatusUpdate(1, 5, 'Delivered')).toThrow('enqueue blew up');

    // The whole transaction must roll back: the job keeps its original status and NO outbox row
    // is left behind — never a diverged local row with no queued action to reconcile it.
    const [job] = db.select().from(jobs).all();
    expect(job).toMatchObject({ statusTypeId: 1, statusName: 'Booked' });
    expect(db.select().from(outbox).all()).toHaveLength(0);

    spy.mockRestore();
  });
});
