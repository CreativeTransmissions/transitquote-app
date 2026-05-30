/** Foreground sync trigger for the jobs list. Records last-synced time on success. */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { pullJobs } from '../database/sync/syncEngine';
import { useConnectivityStore } from '../stores/connectivityStore';

export function useSyncJobs(): UseMutationResult<void, Error, void> {
  const setLastSyncedAt = useConnectivityStore((s) => s.setLastSyncedAt);
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await pullJobs();
      setLastSyncedAt(new Date().toISOString());
    },
  });
}
