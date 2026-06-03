import { planJobPrune, JOB_PRUNE_CHUNK } from '../jobPrune';

describe('planJobPrune', () => {
  it('returns no chunks when nothing was removed', () => {
    expect(planJobPrune([1, 2, 3], [1, 2, 3])).toEqual([]);
  });

  it('plans deletion only for ids absent from the incoming list', () => {
    const chunks = planJobPrune([1, 2, 3, 4], [2, 4]);
    expect(chunks.flat().sort((a, b) => a - b)).toEqual([1, 3]);
  });

  it('removes everything when the incoming list is empty', () => {
    expect(planJobPrune([1, 2, 3], []).flat().sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('caps each chunk at the chunk size so no IN clause exceeds the SQLite variable limit', () => {
    const existing = Array.from({ length: 2500 }, (_, i) => i + 1); // ids 1..2500
    const chunks = planJobPrune(existing, []); // remove all 2500

    expect(chunks.length).toBe(Math.ceil(2500 / JOB_PRUNE_CHUNK));
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(JOB_PRUNE_CHUNK);
    // Every removed id appears exactly once across the chunks.
    expect(chunks.flat().sort((a, b) => a - b)).toEqual(existing);
    expect(JOB_PRUNE_CHUNK).toBeLessThan(999);
  });

  it('crosses the historical 999-variable boundary without a single oversized statement', () => {
    const existing = Array.from({ length: 1500 }, (_, i) => i + 1);
    const chunks = planJobPrune(existing, [1500]); // keep one, remove 1499
    expect(chunks.every((c) => c.length <= JOB_PRUNE_CHUNK)).toBe(true);
    expect(chunks.flat()).not.toContain(1500);
    expect(chunks.flat().length).toBe(1499);
  });
});
