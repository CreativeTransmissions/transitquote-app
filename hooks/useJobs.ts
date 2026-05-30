/**
 * Reactive jobs list (offline-first): reads from the local DB via `useLiveQuery` and triggers a
 * background pull on mount and whenever connectivity is restored. The list renders immediately
 * from the DB; the network fills/refreshes it. Exposes the four states the UI must handle.
 */
import { useEffect } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { jobsListQuery } from '../database/queries/jobs';
import { useConnectivity } from './useConnectivity';
import { useSyncJobs } from './useSync';
import type { JobRow } from '../database/schema';

export interface UseJobsResult {
  jobs: JobRow[];
  dbError: Error | undefined;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: Error | null;
  refresh: () => void;
}

export function useJobs(): UseJobsResult {
  const { data, error } = useLiveQuery(jobsListQuery());
  const isOnline = useConnectivity();
  const sync = useSyncJobs();
  const syncMutate = sync.mutate;

  useEffect(() => {
    if (isOnline) syncMutate();
  }, [isOnline, syncMutate]);

  return {
    jobs: data,
    dbError: error,
    isOnline,
    isSyncing: sync.isPending,
    syncError: sync.error,
    refresh: () => syncMutate(),
  };
}
