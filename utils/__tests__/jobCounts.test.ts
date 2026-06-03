import { countJobsByDriver } from '../jobCounts';

describe('countJobsByDriver', () => {
  it('returns an empty map for no jobs', () => {
    expect(countJobsByDriver([]).size).toBe(0);
  });

  it('tallies jobs per driver and ignores unassigned jobs', () => {
    const counts = countJobsByDriver([
      { driverId: 1 },
      { driverId: 1 },
      { driverId: 2 },
      { driverId: null },
    ]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
    expect(counts.has(0)).toBe(false);
    expect([...counts.keys()].sort()).toEqual([1, 2]);
  });

  it('does not count driverId 0 as unassigned (only null is)', () => {
    const counts = countJobsByDriver([{ driverId: 0 }, { driverId: 0 }]);
    expect(counts.get(0)).toBe(2);
  });
});
