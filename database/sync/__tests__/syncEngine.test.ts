/**
 * Orchestration tests for the pull-side sync engine against a real (in-memory) DB.
 *
 * The pieces pullJobs composes are unit-tested in isolation (reconcileOptimistic, changeDetector,
 * mappers, the query layer). What was untested is the wiring: that the FIRST sync establishes a
 * baseline WITHOUT firing a notification storm, that later syncs notify only against an existing
 * baseline, that the pull is server-wins, and that it protects un-synced optimistic writes.
 *
 * Real: the DB (testkit), reconcileOptimistic, sync-meta, the outbox/jobs queries.
 * Mocked: the network (getJobs/getCustomers), the notifier, and changeDetector (so we control the
 * event list and assert the orchestration contract, not changeDetector's own logic).
 */
jest.mock('../../client');
jest.mock('../../mappers', () => ({
  mapJob: (j: unknown) => j, // getJobs fixtures are already JobInsert-shaped
  mapJobDetail: (d: { job: unknown; detail: unknown }) => d,
  mapCustomer: (c: unknown) => c,
}));
jest.mock('../../../services/api/jobs', () => ({ getJobs: jest.fn(), getJobDetail: jest.fn() }));
jest.mock('../../../services/api/customers', () => ({ getCustomers: jest.fn() }));
jest.mock('../../../services/notifications/notifier', () => ({ presentJobNotifications: jest.fn() }));
jest.mock('../changeDetector', () => ({ detectJobChanges: jest.fn(() => []) }));

import { db, resetTestDb } from '../../testkit/sqliteClient';
import { pullJobs, pullJobDetail, pullCustomers } from '../syncEngine';
import { getJobs, getJobDetail } from '../../../services/api/jobs';
import { getCustomers } from '../../../services/api/customers';
import { presentJobNotifications } from '../../../services/notifications/notifier';
import { detectJobChanges } from '../changeDetector';
import { getAllJobs, applyOptimisticStatus } from '../../queries/jobs';
import { enqueueAction } from '../../queries/outbox';
import { getLastSynced, setLastSynced } from '../../queries/syncMeta';
import { jobs, currentUser, customers, type JobInsert } from '../../schema';

const mockGetJobs = getJobs as jest.Mock;
const mockGetJobDetail = getJobDetail as jest.Mock;
const mockGetCustomers = getCustomers as jest.Mock;
const mockPresent = presentJobNotifications as jest.Mock;
const mockDetect = detectJobChanges as jest.Mock;

function wireJob(id: number, overrides: Partial<JobInsert> = {}): JobInsert {
  return { id, jobRef: `JOB-${id}`, statusTypeId: 1, statusName: 'Booked', driverId: null, ...overrides };
}

function seedDispatchUser(): void {
  db.insert(currentUser).values({ id: 1, roles: ['dispatch'], driverId: null }).run();
}

beforeEach(() => {
  resetTestDb();
  jest.clearAllMocks();
  mockDetect.mockReturnValue([]);
});

describe('pullJobs — baseline sync', () => {
  it('writes the pulled jobs and records last-synced', () => {
    mockGetJobs.mockResolvedValue([wireJob(1), wireJob(2)]);
    return pullJobs().then(() => {
      expect(getAllJobs().map((j) => j.id).sort()).toEqual([1, 2]);
      expect(getLastSynced('jobs')).not.toBeNull();
    });
  });

  it('does NOT notify on the first (baseline) sync, even though every job is new', async () => {
    mockGetJobs.mockResolvedValue([wireJob(1), wireJob(2)]);
    await pullJobs();
    expect(mockDetect).not.toHaveBeenCalled();
    expect(mockPresent).not.toHaveBeenCalled();
  });
});

describe('pullJobs — subsequent sync', () => {
  beforeEach(() => {
    // Establish a baseline so the next pull is no longer the first.
    db.insert(jobs).values(wireJob(1)).run();
    setLastSynced('jobs', '2026-06-01 10:00:00');
    seedDispatchUser();
  });

  it('fires notifications for the events changeDetector reports', async () => {
    const events = [{ jobId: 2, title: 'New job', body: 'JOB-2' }];
    mockDetect.mockReturnValue(events);
    mockGetJobs.mockResolvedValue([wireJob(1), wireJob(2)]);

    await pullJobs();

    expect(mockDetect).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledWith(events);
  });

  it('does not call the notifier when changeDetector reports no events', async () => {
    mockDetect.mockReturnValue([]);
    mockGetJobs.mockResolvedValue([wireJob(1)]);
    await pullJobs();
    expect(mockPresent).not.toHaveBeenCalled();
  });

  it('is server-wins: a pulled status change overwrites the local row', async () => {
    mockGetJobs.mockResolvedValue([wireJob(1, { statusTypeId: 5, statusName: 'Delivered' })]);
    await pullJobs();
    expect(getAllJobs()[0]).toMatchObject({ statusTypeId: 5, statusName: 'Delivered' });
  });

  it('protects an un-synced optimistic write from being reverted by the pull', async () => {
    // Local optimistic change to Delivered, still queued in the outbox (not yet synced).
    applyOptimisticStatus(1, 5, 'Delivered');
    enqueueAction('UPDATE_STATUS', { id: 1, status_type_id: 5 });
    // Server still reports the old status.
    mockGetJobs.mockResolvedValue([wireJob(1, { statusTypeId: 1, statusName: 'Booked' })]);

    await pullJobs();

    // The optimistic value must survive — the pull must not visibly revert a pending action.
    expect(getAllJobs()[0]).toMatchObject({ statusTypeId: 5, statusName: 'Delivered' });
  });
});

describe('pullJobDetail', () => {
  it('skips the network for a non-finite id (e.g. NaN from a bad route param)', async () => {
    await pullJobDetail(Number('not-a-number'));
    expect(mockGetJobDetail).not.toHaveBeenCalled();
  });

  it('fetches and upserts a job detail for a valid id', async () => {
    mockGetJobDetail.mockResolvedValue({
      job: wireJob(7),
      detail: { jobId: 7, hydratedAt: '2026-06-03 10:00:00' },
    });
    await pullJobDetail(7);
    expect(mockGetJobDetail).toHaveBeenCalledWith(7);
    expect(getAllJobs().map((j) => j.id)).toContain(7);
  });
});

describe('pullCustomers', () => {
  it('writes the pulled customers and records last-synced', async () => {
    mockGetCustomers.mockResolvedValue([{ id: 1, firstName: 'Ada', lastName: 'Lovelace' }]);
    await pullCustomers();
    expect(db.select().from(customers).all()).toHaveLength(1);
    expect(getLastSynced('customers')).not.toBeNull();
  });
});
