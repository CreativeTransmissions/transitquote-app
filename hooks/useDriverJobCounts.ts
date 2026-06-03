/** Reactive map of driver id → number of jobs currently assigned to them (spec §6.6/§6.7). */
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { jobsListQuery } from '../database/queries/jobs';
import { countJobsByDriver } from '../utils/jobCounts';

export function useDriverJobCounts(): Map<number, number> {
  const { data } = useLiveQuery(jobsListQuery());
  // Memoise so the returned Map keeps a stable reference across unrelated re-renders — otherwise
  // every render produces a new Map and churns any memoized child / effect that depends on it.
  return useMemo(() => countJobsByDriver(data), [data]);
}
