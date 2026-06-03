/** Pure tally of jobs per assigned driver. Extracted from useDriverJobCounts so it is testable. */
import type { JobRow } from '../database/schema';

export function countJobsByDriver(jobs: readonly Pick<JobRow, 'driverId'>[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const job of jobs) {
    if (job.driverId != null) counts.set(job.driverId, (counts.get(job.driverId) ?? 0) + 1);
  }
  return counts;
}
