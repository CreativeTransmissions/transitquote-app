/** Foreground sync for jobs: flush queued writes first, then pull (spec §11.4). Records last-synced. */
import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isCancel } from 'axios';
import { pullJobs, hydrateJobDetails } from '../database/sync/syncEngine';
import { flushOutbox } from '../database/sync/outboxFlusher';
import { useConnectivityStore } from '../stores/connectivityStore';

export interface SyncJobs {
  /** Start a flush-then-pull sync. No-op-safe to call repeatedly (mutation de-dupes). */
  sync: () => void;
  /** Abort an in-flight sync (e.g. user taps Cancel on the first-sync screen). Benign — no error. */
  cancel: () => void;
  isSyncing: boolean;
  error: Error | null;
}

export function useSyncJobs(): SyncJobs {
  const setLastSyncedAt = useConnectivityStore((s) => s.setLastSyncedAt);
  const setSyncing = useConnectivityStore((s) => s.setSyncing);
  const setDetailHydration = useConnectivityStore((s) => s.setDetailHydration);
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        await flushOutbox(); // push pending local writes before pulling (flush-then-pull)
        await pullJobs(controller.signal);
        // The list is now reconciled in the DB — the list screen can paint. Record the sync here so
        // a cancel during the (background) detail phase still reflects that the list data is current.
        setLastSyncedAt(new Date().toISOString());
        // Bulk-hydrate every job's detail so any job opens fully offline. Non-blocking for first
        // paint; reports determinate progress through the sync indicator.
        await hydrateJobDetails(controller.signal, (done, total) =>
          setDetailHydration(total > 0 ? { done, total } : null),
        );
      } catch (e) {
        // A user cancellation is benign: leave the DB as-is and don't surface it as an error.
        if (isCancel(e)) return;
        throw e;
      } finally {
        setDetailHydration(null);
      }
    },
    onMutate: () => setSyncing(true),
    onSettled: () => setSyncing(false),
  });

  const { mutate, reset, isPending, error } = mutation;
  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    reset(); // clear any pending/error state so the UI returns to its DB-backed view
  }, [reset]);

  return {
    sync: useCallback(() => mutate(), [mutate]),
    cancel,
    isSyncing: isPending,
    error,
  };
}
