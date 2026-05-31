import { detectJobChanges, type ChangeContext } from '../changeDetector';
import type { JobRow } from '../../schema';

// Minimal JobRow factory — only the fields the detector reads matter.
function job(over: Partial<JobRow> & { id: number }): JobRow {
  return {
    id: over.id,
    jobRef: over.jobRef ?? `JOB-${over.id}`,
    serviceId: null,
    vehicleId: null,
    statusTypeId: over.statusTypeId ?? 1,
    customerId: null,
    driverId: over.driverId ?? null,
    acceptedQuoteId: null,
    paymentTypeId: null,
    paymentStatusId: null,
    description: null,
    customerReference: null,
    deliveryContactName: null,
    deliveryTime: null,
    weight: null,
    statusName: over.statusName ?? 'New',
    driverName: null,
    paymentTypeName: null,
    paymentStatusName: null,
    customerLastName: null,
    created: null,
    modified: null,
  } as JobRow;
}

const driverCtx: ChangeContext = { role: 'driver', driverId: 7 };
const dispatchCtx: ChangeContext = { role: 'dispatch', driverId: null };

describe('detectJobChanges — driver', () => {
  it('fires "assigned" when a job becomes mine', () => {
    const prev = [job({ id: 1, driverId: null })];
    const next = [job({ id: 1, driverId: 7 })];
    const events = detectJobChanges(prev, next, driverCtx);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('assigned');
    expect(events[0].jobId).toBe(1);
  });

  it('fires "assigned" for a brand-new job already assigned to me', () => {
    const events = detectJobChanges([], [job({ id: 2, driverId: 7 })], driverCtx);
    expect(events.map((e) => e.type)).toEqual(['assigned']);
  });

  it('does not double-fire status on a newly-assigned job', () => {
    const prev = [job({ id: 1, driverId: null, statusTypeId: 1 })];
    const next = [job({ id: 1, driverId: 7, statusTypeId: 2 })];
    expect(detectJobChanges(prev, next, driverCtx).map((e) => e.type)).toEqual(['assigned']);
  });

  it('fires "status" when one of my jobs changes status', () => {
    const prev = [job({ id: 1, driverId: 7, statusTypeId: 1 })];
    const next = [job({ id: 1, driverId: 7, statusTypeId: 3, statusName: 'In Transit' })];
    const events = detectJobChanges(prev, next, driverCtx);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('status');
    expect(events[0].body).toContain('In Transit');
  });

  it('ignores jobs that are not mine', () => {
    const prev = [job({ id: 1, driverId: 9, statusTypeId: 1 })];
    const next = [job({ id: 1, driverId: 9, statusTypeId: 2 })];
    expect(detectJobChanges(prev, next, driverCtx)).toEqual([]);
  });

  it('emits nothing when the driver has no driver record', () => {
    const next = [job({ id: 1, driverId: 7 })];
    expect(detectJobChanges([], next, { role: 'driver', driverId: null })).toEqual([]);
  });
});

describe('detectJobChanges — dispatcher', () => {
  it('fires "new_job" for unseen jobs', () => {
    const events = detectJobChanges([job({ id: 1 })], [job({ id: 1 }), job({ id: 2 })], dispatchCtx);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('new_job');
    expect(events[0].jobId).toBe(2);
  });

  it('fires "status" for any job whose status changed', () => {
    const prev = [job({ id: 1, statusTypeId: 1 })];
    const next = [job({ id: 1, statusTypeId: 2, statusName: 'Assigned' })];
    expect(detectJobChanges(prev, next, dispatchCtx).map((e) => e.type)).toEqual(['status']);
  });

  it('emits nothing when nothing changed', () => {
    const same = [job({ id: 1, statusTypeId: 1 })];
    expect(detectJobChanges(same, same, dispatchCtx)).toEqual([]);
  });
});
