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
import { eq } from 'drizzle-orm';
import { db, resetTestDb } from '../../testkit/sqliteClient';
import { pullJobs, pullJobDetail, pullCustomers, hydrateJobDetails } from '../syncEngine';
import { getJobs, getJobDetail } from '../../../services/api/jobs';
import { getCustomers } from '../../../services/api/customers';
import { presentJobNotifications } from '../../../services/notifications/notifier';
import { detectJobChanges } from '../changeDetector';
import { getAllJobs, applyOptimisticStatus, getJobsNeedingDetail } from '../../queries/jobs';
import { enqueueAction } from '../../queries/outbox';
import { getLastSynced, setLastSynced } from '../../queries/syncMeta';
import { jobs, jobDetails, currentUser, customers, type JobInsert } from '../../schema';

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

  it('fetches and persists the detail blob ONLY (never the jobs row)', async () => {
    // The jobs row already exists from a list pull; the FK on job_details requires it.
    db.insert(jobs).values(wireJob(7, { statusTypeId: 1, statusName: 'Booked' })).run();
    mockGetJobDetail.mockResolvedValue({
      job: { ...wireJob(7, { statusTypeId: 9, statusName: 'STALE' }), modified: '2026-06-02 10:00:00' },
      detail: { jobId: 7, hydratedAt: '2026-06-03 10:00:00' },
    });

    await pullJobDetail(7);

    expect(mockGetJobDetail).toHaveBeenCalledWith(7, undefined);
    const [d] = db.select().from(jobDetails).where(eq(jobDetails.jobId, 7)).all();
    expect(d).toMatchObject({ jobId: 7, jobModifiedAt: '2026-06-02 10:00:00' });
    // The detail payload's (stale) status must NOT have been written onto the jobs row.
    const [j] = getAllJobs();
    expect(j).toMatchObject({ statusTypeId: 1, statusName: 'Booked' });
  });
});

describe('hydrateJobDetails', () => {
  // Identity mapper returns its first arg; have the network echo a valid detail row per id.
  beforeEach(() => {
    mockGetJobDetail.mockImplementation((id: number) =>
      Promise.resolve({ detail: { jobId: id, hydratedAt: 'h' } }),
    );
  });

  it('hydrates every job that is missing detail, then leaves none needing detail', async () => {
    db.insert(jobs).values([wireJob(1), wireJob(2), wireJob(3)]).run();

    await hydrateJobDetails();

    expect(mockGetJobDetail).toHaveBeenCalledTimes(3);
    expect(db.select().from(jobDetails).all().map((d) => d.jobId).sort()).toEqual([1, 2, 3]);
    expect(getJobsNeedingDetail()).toEqual([]);
  });

  it('is incremental: a steady-state sync (nothing stale) issues zero detail requests', async () => {
    db.insert(jobs).values(wireJob(1, { modified: '2026-06-02 10:00:00' })).run();
    db.insert(jobDetails)
      .values({ jobId: 1, hydratedAt: 'h', jobModifiedAt: '2026-06-02 10:00:00' })
      .run();

    await hydrateJobDetails();

    expect(mockGetJobDetail).not.toHaveBeenCalled();
  });

  it('reports determinate progress as each job completes', async () => {
    db.insert(jobs).values([wireJob(1), wireJob(2)]).run();
    const progress: [number, number][] = [];

    await hydrateJobDetails(undefined, (done, total) => progress.push([done, total]));

    expect(progress[0]).toEqual([0, 2]); // initial
    expect(progress.at(-1)).toEqual([2, 2]); // final
  });

  it('isolates a per-job failure: one detail 500 doesn’t abort the run and stays needing detail', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    db.insert(jobs).values([wireJob(1), wireJob(2), wireJob(3)]).run();
    mockGetJobDetail.mockImplementation((id: number) =>
      id === 2
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ detail: { jobId: id, hydratedAt: 'h' } }),
    );

    await hydrateJobDetails();
    expect(warn).toHaveBeenCalledWith('[sync] detail hydration failed for job 2', expect.any(Error));
    warn.mockRestore();

    // 1 and 3 persisted; 2 failed and is still pending re-hydration next sync.
    expect(db.select().from(jobDetails).all().map((d) => d.jobId).sort()).toEqual([1, 3]);
    expect(getJobsNeedingDetail().map((r) => r.id)).toEqual([2]);
  });

  it('does no work and issues no requests when the signal is already aborted', async () => {
    db.insert(jobs).values([wireJob(1), wireJob(2)]).run();
    const controller = new AbortController();
    controller.abort();

    await hydrateJobDetails(controller.signal);

    expect(mockGetJobDetail).not.toHaveBeenCalled();
    expect(db.select().from(jobDetails).all()).toHaveLength(0);
  });

  it('stamps job_modified_at from the list row so the next sync sees the job as up to date', async () => {
    db.insert(jobs).values(wireJob(1, { modified: '2026-06-05 10:00:00' })).run();

    await hydrateJobDetails();

    const [d] = db.select().from(jobDetails).all();
    expect(d.jobModifiedAt).toBe('2026-06-05 10:00:00');
  });

  it('never reverts a pending optimistic status through a full list→detail sync (AC #3 regression)', async () => {
    // Baseline so pullJobs is not the first sync; seed a dispatch user.
    db.insert(jobs).values(wireJob(1, { statusTypeId: 1, statusName: 'Booked' })).run();
    setLastSynced('jobs', '2026-06-01 10:00:00');
    seedDispatchUser();

    // Queue an optimistic status change, still pending in the outbox.
    applyOptimisticStatus(1, 5, 'Delivered');
    enqueueAction('UPDATE_STATUS', { id: 1, status_type_id: 5 });

    // The server list still reports the OLD status; detail also carries the old status (irrelevant —
    // hydration is detail-only).
    mockGetJobs.mockResolvedValue([wireJob(1, { statusTypeId: 1, statusName: 'Booked' })]);

    await pullJobs();
    await hydrateJobDetails();

    // The optimistic value survives BOTH the list reconcile and the detail hydration.
    expect(getAllJobs()[0]).toMatchObject({ statusTypeId: 5, statusName: 'Delivered' });
    // And the detail blob was still persisted.
    expect(db.select().from(jobDetails).all().map((d) => d.jobId)).toEqual([1]);
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

describe('hydrateJobDetails — staged hydration (P-2)', () => {
  // Use a real DETAIL_HYDRATION_FIRST_BATCH value for the boundary test.
  // Import the constant at the top of the test to get the live value.
  const { DETAIL_HYDRATION_FIRST_BATCH } = jest.requireActual('../../../constants') as {
    DETAIL_HYDRATION_FIRST_BATCH: number;
  };

  beforeEach(() => {
    mockGetJobDetail.mockImplementation((id: number) =>
      Promise.resolve({ detail: { jobId: id, hydratedAt: 'h' } }),
    );
  });

  it('hydrates all jobs in one pass when the count is within DETAIL_HYDRATION_FIRST_BATCH', async () => {
    const count = Math.min(DETAIL_HYDRATION_FIRST_BATCH, 5); // small set fits in one batch
    const jobRows = Array.from({ length: count }, (_, i) => wireJob(i + 1));
    db.insert(jobs).values(jobRows).run();

    await hydrateJobDetails();

    expect(mockGetJobDetail).toHaveBeenCalledTimes(count);
    expect(db.select().from(jobDetails).all()).toHaveLength(count);
    expect(getJobsNeedingDetail()).toEqual([]);
  });

  it('hydrates all jobs across two passes when the count exceeds DETAIL_HYDRATION_FIRST_BATCH', async () => {
    // Seed DETAIL_HYDRATION_FIRST_BATCH + 10 jobs so pass2 has 10 items.
    const total = DETAIL_HYDRATION_FIRST_BATCH + 10;
    const jobRows = Array.from({ length: total }, (_, i) => wireJob(i + 1));
    db.insert(jobs).values(jobRows).run();

    await hydrateJobDetails();

    // Every job should have been fetched and persisted — pass1 + pass2.
    expect(mockGetJobDetail).toHaveBeenCalledTimes(total);
    expect(db.select().from(jobDetails).all()).toHaveLength(total);
    expect(getJobsNeedingDetail()).toEqual([]);
  });

  it('progress totals cover the entire work set, not just the first batch', async () => {
    const total = DETAIL_HYDRATION_FIRST_BATCH + 5;
    const jobRows = Array.from({ length: total }, (_, i) => wireJob(i + 1));
    db.insert(jobs).values(jobRows).run();

    const progress: [number, number][] = [];
    await hydrateJobDetails(undefined, (done, t) => progress.push([done, t]));

    // Every progress call should report `total` as the grand total.
    const totals = progress.map(([, t]) => t);
    expect(new Set(totals).size).toBe(1); // all the same
    expect(totals[0]).toBe(total);

    // The final progress entry should be [total, total].
    expect(progress.at(-1)).toEqual([total, total]);
  });

  it('cancellation mid-first-batch stops the run; whatever was persisted stays', async () => {
    const total = DETAIL_HYDRATION_FIRST_BATCH + 20;
    const jobRows = Array.from({ length: total }, (_, i) => wireJob(i + 1));
    db.insert(jobs).values(jobRows).run();

    const controller = new AbortController();
    let callCount = 0;
    mockGetJobDetail.mockImplementation(async (id: number) => {
      callCount += 1;
      // Abort after 3 fetches so we cancel mid-first-batch.
      if (callCount === 3) controller.abort();
      return { detail: { jobId: id, hydratedAt: 'h' } };
    });

    await hydrateJobDetails(controller.signal);

    // Some details were persisted; no more than the first batch was attempted.
    const hydrated = db.select().from(jobDetails).all().length;
    expect(hydrated).toBeGreaterThan(0);
    expect(hydrated).toBeLessThanOrEqual(DETAIL_HYDRATION_FIRST_BATCH);
    // The remainder is still reported as "needing detail".
    expect(getJobsNeedingDetail().length).toBeGreaterThan(0);
  });

  it('second pass does not run when the signal is aborted after the first pass', async () => {
    const total = DETAIL_HYDRATION_FIRST_BATCH + 5;
    const jobRows = Array.from({ length: total }, (_, i) => wireJob(i + 1));
    db.insert(jobs).values(jobRows).run();

    const controller = new AbortController();
    let callCount = 0;
    mockGetJobDetail.mockImplementation(async (id: number) => {
      callCount += 1;
      // Abort exactly when the first batch completes (on the last call of pass1).
      if (callCount === DETAIL_HYDRATION_FIRST_BATCH) controller.abort();
      return { detail: { jobId: id, hydratedAt: 'h' } };
    });

    await hydrateJobDetails(controller.signal);

    // Only the first batch (or fewer, due to pool races) should be hydrated.
    const hydrated = db.select().from(jobDetails).all().length;
    expect(hydrated).toBeLessThanOrEqual(DETAIL_HYDRATION_FIRST_BATCH);
    // The extra 5 from pass2 were NOT hydrated.
    expect(getJobsNeedingDetail().length).toBeGreaterThanOrEqual(5);
  });
});
