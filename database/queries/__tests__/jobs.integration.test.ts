/**
 * Integration tests for the jobs query layer against a real (in-memory) SQLite database.
 *
 * Unlike the pure-helper tests (planJobPrune, mappers), these exercise the actual Drizzle writes
 * and reads — upsert/prune semantics, optimistic writes, and detail preservation — which were
 * previously untestable because the production client opens a native expo-sqlite connection.
 * The `jest.mock('../../client')` below swaps in the better-sqlite3 harness (database/__mocks__).
 */
jest.mock('../../client');

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
  upsertJobWithDetail,
} from '../jobs';
import { jobs, jobDetails, type JobInsert, type JobDetailRow } from '../../schema';

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

describe('upsertJobWithDetail', () => {
  it('writes the job and its detail blob together', () => {
    const detail: JobDetailRow = {
      jobId: 1,
      customer: null,
      journey: null,
      stops: [{ address: '1 High St' }] as JobDetailRow['stops'],
      quote: null,
      jobDate: null,
      payment: null,
      hydratedAt: '2026-06-01 12:00:00',
    };
    upsertJobWithDetail(job(1), detail);

    expect(getAllJobs()).toHaveLength(1);
    const [d] = db.select().from(jobDetails).all();
    expect(d.jobId).toBe(1);
    expect(d.stops).toEqual([{ address: '1 High St' }]);
  });
});
