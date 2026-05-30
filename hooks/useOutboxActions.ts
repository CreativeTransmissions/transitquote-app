/** User actions on failed outbox items: retry (re-queue + flush) or discard. */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { retryOutboxItem, discardOutboxItem } from '../database/queries/outbox';
import { flushOutbox } from '../database/sync/outboxFlusher';

export function useRetryOutboxItem(): UseMutationResult<void, Error, number> {
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      retryOutboxItem(id);
      await flushOutbox();
    },
  });
}

export function useDiscardOutboxItem(): UseMutationResult<void, Error, number> {
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      discardOutboxItem(id);
    },
  });
}
