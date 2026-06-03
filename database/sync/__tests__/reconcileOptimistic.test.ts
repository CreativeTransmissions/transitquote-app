import { reconcileOptimistic, type PendingJobMutation } from '../reconcileOptimistic';
import type { JobInsert, JobRow } from '../../schema';

// Minimal job factory — only the columns the reconcile cares about matter; the rest are filler.
function job(over: Partial<JobRow>): JobRow {
  return {
    id: 1,
    jobRef: 'JOB-1',
    serviceId: null,
    vehicleId: null,
    statusTypeId: null,
    customerId: null,
    driverId: null,
    acceptedQuoteId: null,
    paymentTypeId: null,
    paymentStatusId: null,
    description: null,
    customerReference: null,
    deliveryContactName: null,
    deliveryTime: null,
    weight: null,
    statusName: null,
    driverName: null,
    paymentTypeName: null,
    paymentStatusName: null,
    customerLastName: null,
    customerFirstName: null,
    pickupAddress: null,
    pickupDatetime: null,
    pickupIsAsap: null,
    created: null,
    modified: null,
    ...over,
  };
}

const prevMap = (rows: JobRow[]) => new Map(rows.map((r) => [r.id, r]));

describe('reconcileOptimistic', () => {
  it('returns the pulled rows unchanged when there are no pending mutations', () => {
    const next: JobInsert[] = [job({ id: 1, statusTypeId: 5, statusName: 'Delivered' })];
    const out = reconcileOptimistic(next, prevMap([job({ id: 1, statusTypeId: 2 })]), []);
    expect(out).toBe(next); // same reference — no work done
  });

  it('preserves an optimistic status while the UPDATE_STATUS write is still pending', () => {
    // Server still reports the OLD status (2); local optimistic value is 5 ("Delivered").
    const local = job({ id: 1, statusTypeId: 5, statusName: 'Delivered', driverId: 9, driverName: 'Sam' });
    const server: JobInsert = job({ id: 1, statusTypeId: 2, statusName: 'Assigned', driverId: 9, driverName: 'Sam' });
    const pending: PendingJobMutation[] = [{ jobId: 1, actionType: 'UPDATE_STATUS' }];

    const [out] = reconcileOptimistic([server], prevMap([local]), pending);

    expect(out.statusTypeId).toBe(5); // optimistic value kept, NOT reverted to server's 2
    expect(out.statusName).toBe('Delivered');
    // Assignment columns are not touched by an UPDATE_STATUS mutation — take the server value.
    expect(out.driverId).toBe(9);
  });

  it('preserves an optimistic assignment while the ASSIGN_DRIVER write is still pending', () => {
    const local = job({ id: 7, driverId: 42, driverName: 'Alex', statusTypeId: 2 });
    const server: JobInsert = job({ id: 7, driverId: null, driverName: null, statusTypeId: 2 });
    const pending: PendingJobMutation[] = [{ jobId: 7, actionType: 'ASSIGN_DRIVER' }];

    const [out] = reconcileOptimistic([server], prevMap([local]), pending);

    expect(out.driverId).toBe(42); // optimistic assignment kept, NOT reverted to null
    expect(out.driverName).toBe('Alex');
  });

  it('preserves both column sets when a job has two pending mutations', () => {
    const local = job({ id: 3, statusTypeId: 5, statusName: 'Delivered', driverId: 42, driverName: 'Alex' });
    const server: JobInsert = job({ id: 3, statusTypeId: 2, statusName: 'Assigned', driverId: null, driverName: null });
    const pending: PendingJobMutation[] = [
      { jobId: 3, actionType: 'UPDATE_STATUS' },
      { jobId: 3, actionType: 'ASSIGN_DRIVER' },
    ];

    const [out] = reconcileOptimistic([server], prevMap([local]), pending);

    expect(out.statusTypeId).toBe(5);
    expect(out.driverId).toBe(42);
  });

  it('leaves jobs without a pending mutation fully server-wins', () => {
    const server: JobInsert = job({ id: 1, statusTypeId: 2, driverId: 9 });
    const pending: PendingJobMutation[] = [{ jobId: 99, actionType: 'UPDATE_STATUS' }];

    const [out] = reconcileOptimistic([server], prevMap([job({ id: 1, statusTypeId: 5 })]), pending);

    expect(out.statusTypeId).toBe(2); // not in pending set → server value wins
  });

  it('does not invent a local row when the pulled job was not seen before', () => {
    const server: JobInsert = job({ id: 8, statusTypeId: 2 });
    const pending: PendingJobMutation[] = [{ jobId: 8, actionType: 'UPDATE_STATUS' }];

    const [out] = reconcileOptimistic([server], prevMap([]), pending); // empty prev

    expect(out.statusTypeId).toBe(2); // no local optimistic value to preserve → server value
  });
});
