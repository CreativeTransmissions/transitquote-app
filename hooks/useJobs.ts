/**
 * Reactive jobs list (offline-first): reads from the local DB via `useLiveQuery` and triggers a
 * background pull on mount and whenever connectivity is restored. The list renders immediately
 * from the DB; the network fills/refreshes it. Exposes the four states the UI must handle.
 *
 * `scope` selects the local view (the background pull always fetches the full list the server
 * returns; filtering to a scope happens against the DB):
 *  - 'all'        → every job (dispatcher; centralized driver — server filters to the driver)
 *  - 'available'  → unassigned jobs (decentralized "Available" tab)
 *  - 'mine'       → jobs assigned to `driverId` (decentralized "My Jobs" tab)
 */
import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { availableJobsQuery, jobsListQuery, myJobsQuery } from '../database/queries/jobs';
import { useConnectivity } from './useConnectivity';
import { useSyncJobs } from './useSync';
import type { JobRow } from '../database/schema';

export type JobScope = 'all' | 'available' | 'mine';

export interface UseJobsResult {
  jobs: JobRow[];
  dbError: Error | undefined;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: Error | null;
  refresh: () => void;
  /** Abort an in-flight sync — used by the first-sync progress UI's Cancel action. */
  cancelSync: () => void;
}

export function useJobs(scope: JobScope = 'all', driverId: number | null = null): UseJobsResult {
  const query = useMemo(() => {
    if (scope === 'available') return availableJobsQuery();
    // -1 can never match a real driver id, so an unknown driver yields an (correct) empty list.
    if (scope === 'mine') return myJobsQuery(driverId ?? -1);
    return jobsListQuery();
  }, [scope, driverId]);

  const { data, error } = useLiveQuery(query, [scope, driverId]);
  const isOnline = useConnectivity();
  const sync = useSyncJobs();
  const syncStart = sync.sync;

  useEffect(() => {
    if (isOnline) syncStart();
  }, [isOnline, syncStart]);

  return {
    jobs: data,
    dbError: error,
    isOnline,
    isSyncing: sync.isSyncing,
    syncError: sync.error,
    refresh: syncStart,
    cancelSync: sync.cancel,
  };
}
