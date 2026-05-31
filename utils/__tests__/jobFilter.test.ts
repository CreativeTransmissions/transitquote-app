import { applyJobFilters, countActiveFilters, EMPTY_FILTERS, type JobFilters } from '../jobFilter';

type TestJob = { statusTypeId: number | null; driverId: number | null; deliveryTime: string | null };

const jobs: TestJob[] = [
  { statusTypeId: 1, driverId: 10, deliveryTime: '2026-05-10 09:00:00' },
  { statusTypeId: 2, driverId: 20, deliveryTime: '2026-05-20 09:00:00' },
  { statusTypeId: 3, driverId: null, deliveryTime: null },
];

function filters(overrides: Partial<JobFilters>): JobFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

describe('countActiveFilters', () => {
  it('counts each active group once', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters(filters({ statusIds: [1, 2] }))).toBe(1);
    expect(countActiveFilters(filters({ driverId: 10 }))).toBe(1);
    expect(countActiveFilters(filters({ dateFrom: '2026-05-01' }))).toBe(1);
    expect(countActiveFilters(filters({ statusIds: [1], driverId: 10, dateTo: '2026-05-31' }))).toBe(3);
  });
});

describe('applyJobFilters', () => {
  it('returns all jobs when no filters are set', () => {
    expect(applyJobFilters(jobs, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by status (OR across ids)', () => {
    const out = applyJobFilters(jobs, filters({ statusIds: [1, 3] }));
    expect(out.map((j) => j.statusTypeId)).toEqual([1, 3]);
  });

  it('filters by driver', () => {
    const out = applyJobFilters(jobs, filters({ driverId: 20 }));
    expect(out).toHaveLength(1);
    expect(out[0].driverId).toBe(20);
  });

  it('filters by inclusive date range and excludes jobs without a date', () => {
    const out = applyJobFilters(jobs, filters({ dateFrom: '2026-05-15', dateTo: '2026-05-25' }));
    expect(out.map((j) => j.statusTypeId)).toEqual([2]);
  });

  it('combines filters (AND across groups)', () => {
    const out = applyJobFilters(jobs, filters({ statusIds: [1, 2], driverId: 10 }));
    expect(out.map((j) => j.statusTypeId)).toEqual([1]);
  });
});
