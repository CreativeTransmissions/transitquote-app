/**
 * Integration tests for the jobs query layer against a real (in-memory) SQLite database.
 *
 * Unlike the pure-helper tests (planJobPrune, mappers), these exercise the actual Drizzle writes
 * and reads — upsert/prune semantics, optimistic writes, and detail preservation — which were
 * previously untestable because the production client opens a native expo-sqlite connection.
 * The `jest.mock('../../client')` below swaps in the better-sqlite3 harness (database/__mocks__).
 */
import { db, resetTestDb } from '../../testkit/sqliteClient';
import {
  replaceJobs,
  getAllJobs,
  jobsListQuery,
  availableJobsQuery,
  myJobsQuery,
  jobByIdQuery,
  jobDetailByIdQuery,
  applyOptimisticStatus,
  applyOptimisticAssignment,
  getJobsNeedingDetail,
  upsertJobDetailRow,
} from '../jobs';
import { jobs, jobDetails, type JobInsert, type JobDetailRow } from '../../schema';

jest.mock('../../client');

function detailRow(jobId: number, overrides: Partial<JobDetailRow> = {}): JobDetailRow {
  return {
    jobId,
    customer: null,
    journey: null,
    stops: null,
    quote: null,
    jobDate: null,
    payment: null,
    hydratedAt: '2026-06-03 12:00:00',
    jobModifiedAt: null,
    ...overrides,
  };
}

function job(id: number, overrides: Partial<JobInsert> = {}): JobInsert {
  return {
    id,
    jobRef: `JOB-${id}`,
    statusTypeId: 1,
    statusName: 'Booked',
    driverId: null,
    modified: `2026-06-0${id} 10:00:00`,
    ...overrides,
  };
}

beforeEach(() => resetTestDb());

describe('replaceJobs', () => {
  it('inserts the pulled jobs', () => {
    replaceJobs([job(1), job(2)]);
    expect(getAllJobs().map((j) => j.id).sort()).toEqual([1, 2]);
  });

  it('prunes jobs the server no longer returns (and their detail rows)', () => {
    replaceJobs([job(1), job(2), job(3)]);
    // Hydrate detail for job 2 so we can confirm the prune cascades to job_details.
    db.insert(jobDetails).values({ jobId: 2, hydratedAt: '2026-06-02 10:00:00' }).run();

    replaceJobs([job(1)]); // server now only returns job 1

    expect(getAllJobs().map((j) => j.id)).toEqual([1]);
    expect(db.select().from(jobDetails).all()).toHaveLength(0);
  });

  it('upserts existing jobs (status change from a fresh pull wins)', () => {
    replaceJobs([job(1, { statusName: 'Booked', statusTypeId: 1 })]);
    replaceJobs([job(1, { statusName: 'Delivered', statusTypeId: 5 })]);

    const [row] = getAllJobs();
    expect(row.statusName).toBe('Delivered');
    expect(row.statusTypeId).toBe(5);
  });

  it('preserves a hydrated detail row when the job survives the pull', () => {
    replaceJobs([job(1)]);
    db.insert(jobDetails).values({ jobId: 1, hydratedAt: '2026-06-01 10:00:00' }).run();

    replaceJobs([job(1, { statusName: 'In Transit' })]); // re-pulled, still present

    expect(db.select().from(jobDetails).all()).toHaveLength(1);
  });
});

describe('reactive query builders', () => {
  beforeEach(() => {
    replaceJobs([
      job(1, { driverId: null, modified: '2026-06-01 10:00:00' }),
      job(2, { driverId: 7, modified: '2026-06-03 10:00:00' }),
      job(3, { driverId: 99, modified: '2026-06-02 10:00:00' }),
    ]);
  });

  it('jobsListQuery returns every job, newest modified first', () => {
    expect(jobsListQuery().all().map((j) => j.id)).toEqual([2, 3, 1]);
  });

  it('availableJobsQuery returns only unassigned jobs', () => {
    expect(availableJobsQuery().all().map((j) => j.id)).toEqual([1]);
  });

  it('myJobsQuery returns only the given driver’s jobs', () => {
    expect(myJobsQuery(7).all().map((j) => j.id)).toEqual([2]);
  });

  it('jobByIdQuery / jobDetailByIdQuery select a single row', () => {
    expect(jobByIdQuery(2).all().map((j) => j.id)).toEqual([2]);
    expect(jobDetailByIdQuery(2).all()).toHaveLength(0);
  });
});

describe('optimistic writes', () => {
  beforeEach(() => replaceJobs([job(1, { statusTypeId: 1, statusName: 'Booked', driverId: null })]));

  it('applyOptimisticStatus updates status + bumps modified', () => {
    applyOptimisticStatus(1, 5, 'Delivered');
    const [row] = getAllJobs();
    expect(row.statusTypeId).toBe(5);
    expect(row.statusName).toBe('Delivered');
  });

  it('applyOptimisticAssignment sets driver id + name', () => {
    applyOptimisticAssignment(1, 42, 'Pat Driver');
    const [row] = getAllJobs();
    expect(row.driverId).toBe(42);
    expect(row.driverName).toBe('Pat Driver');
  });
});

describe('upsertJobDetailRow', () => {
  beforeEach(() => replaceJobs([job(1, { statusTypeId: 1, statusName: 'Booked', driverId: null })]));

  it('writes the detail blob and the captured job_modified_at', () => {
    const detail = detailRow(1, { stops: [{ address: '1 High St' }] as JobDetailRow['stops'] });
    upsertJobDetailRow(detail, '2026-06-01 10:00:00');

    const [d] = db.select().from(jobDetails).all();
    expect(d.jobId).toBe(1);
    expect(d.stops).toEqual([{ address: '1 High St' }]);
    expect(d.jobModifiedAt).toBe('2026-06-01 10:00:00');
  });

  it('NEVER touches the jobs row — status/assignment survive a detail write', () => {
    // Server detail carries a stale status; an optimistic local change set the job to Delivered/42.
    applyOptimisticStatus(1, 5, 'Delivered');
    applyOptimisticAssignment(1, 42, 'Pat Driver');

    upsertJobDetailRow(detailRow(1), '2026-06-01 10:00:00');

    const [j] = getAllJobs();
    expect(j.statusTypeId).toBe(5);
    expect(j.statusName).toBe('Delivered');
    expect(j.driverId).toBe(42);
    expect(j.driverName).toBe('Pat Driver');
  });

  it('upserts: a second write replaces the blob in place', () => {
    upsertJobDetailRow(detailRow(1, { hydratedAt: 'first' }), '2026-06-01 10:00:00');
    upsertJobDetailRow(detailRow(1, { hydratedAt: 'second' }), '2026-06-02 10:00:00');

    const rows = db.select().from(jobDetails).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].hydratedAt).toBe('second');
    expect(rows[0].jobModifiedAt).toBe('2026-06-02 10:00:00');
  });
});

describe('getJobsNeedingDetail', () => {
  it('returns a job with no detail row (missing)', () => {
    replaceJobs([job(1, { modified: '2026-06-01 10:00:00' })]);
    expect(getJobsNeedingDetail().map((r) => r.id)).toEqual([1]);
  });

  it('returns a job whose modified advanced past the hydrated job_modified_at (stale)', () => {
    replaceJobs([job(1, { modified: '2026-06-02 10:00:00' })]);
    upsertJobDetailRow(detailRow(1), '2026-06-01 10:00:00'); // hydrated against the older modified
    expect(getJobsNeedingDetail().map((r) => r.id)).toEqual([1]);
  });

  it('excludes an up-to-date job (hydrated at the current modified) — zero work in steady state', () => {
    replaceJobs([job(1, { modified: '2026-06-02 10:00:00' })]);
    upsertJobDetailRow(detailRow(1), '2026-06-02 10:00:00');
    expect(getJobsNeedingDetail()).toEqual([]);
  });

  it('treats a pre-0005 row (null job_modified_at) as stale, re-hydrated once', () => {
    replaceJobs([job(1, { modified: '2026-06-02 10:00:00' })]);
    upsertJobDetailRow(detailRow(1), null); // legacy hydrated row, no marker
    expect(getJobsNeedingDetail().map((r) => r.id)).toEqual([1]);
  });

  it('orders the current driver’s assigned jobs first, then the rest by newest', () => {
    replaceJobs([
      job(1, { driverId: 7, modified: '2026-06-01 10:00:00' }),
      job(2, { driverId: null, modified: '2026-06-03 10:00:00' }),
      job(3, { driverId: 7, modified: '2026-06-02 10:00:00' }),
    ]);
    // Assigned-to-7 first (newest-first within the group: 3 then 1), then others (2).
    expect(getJobsNeedingDetail(7).map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it('returns id + the captured modified so hydration can stamp job_modified_at', () => {
    replaceJobs([job(1, { modified: '2026-06-01 10:00:00' })]);
    expect(getJobsNeedingDetail()).toEqual([{ id: 1, modified: '2026-06-01 10:00:00' }]);
  });
});
