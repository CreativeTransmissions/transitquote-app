/** Reactive map of driver id → number of jobs currently assigned to them (spec §6.6/§6.7). */
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { jobsListQuery } from '../database/queries/jobs';

export function useDriverJobCounts(): Map<number, number> {
  const { data } = useLiveQuery(jobsListQuery());

  const counts = new Map<number, number>();
  for (const job of data) {
    if (job.driverId != null) counts.set(job.driverId, (counts.get(job.driverId) ?? 0) + 1);
  }
  return counts;
}
