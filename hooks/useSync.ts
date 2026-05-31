/** Foreground sync for jobs: flush queued writes first, then pull (spec §11.4). Records last-synced. */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { pullJobs } from '../database/sync/syncEngine';
import { flushOutbox } from '../database/sync/outboxFlusher';
import { useConnectivityStore } from '../stores/connectivityStore';

export function useSyncJobs(): UseMutationResult<void, Error, void> {
  const setLastSyncedAt = useConnectivityStore((s) => s.setLastSyncedAt);
  const setSyncing = useConnectivityStore((s) => s.setSyncing);
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await flushOutbox(); // push pending local writes before pulling (flush-then-pull)
      await pullJobs();
      setLastSyncedAt(new Date().toISOString());
    },
    onMutate: () => setSyncing(true),
    onSettled: () => setSyncing(false),
  });
}
