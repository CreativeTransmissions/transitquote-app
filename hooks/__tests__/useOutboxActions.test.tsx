/**
 * Tests for the failed-outbox-item actions: useRetryOutboxItem (re-queue then flush) and
 * useDiscardOutboxItem (drop the item; the next pull overwrites the optimistic value — no flush).
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../useOutboxActions';
import { retryOutboxItem, discardOutboxItem } from '../../database/queries/outbox';
import { flushOutbox } from '../../database/sync/outboxFlusher';

jest.mock('../../database/queries/outbox', () => ({
  retryOutboxItem: jest.fn(),
  discardOutboxItem: jest.fn(),
}));
jest.mock('../../database/sync/outboxFlusher', () => ({ flushOutbox: jest.fn() }));

const mockRetry = retryOutboxItem as jest.Mock;
const mockDiscard = discardOutboxItem as jest.Mock;
const mockFlush = flushOutbox as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlush.mockResolvedValue(undefined);
});

describe('useRetryOutboxItem', () => {
  it('re-queues the item and flushes', async () => {
    const { result } = renderHook(() => useRetryOutboxItem(), { wrapper });
    await result.current.mutateAsync(42);
    expect(mockRetry).toHaveBeenCalledWith(42);
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });
});

describe('useDiscardOutboxItem', () => {
  it('discards the item without flushing', async () => {
    const { result } = renderHook(() => useDiscardOutboxItem(), { wrapper });
    await result.current.mutateAsync(42);
    expect(mockDiscard).toHaveBeenCalledWith(42);
    expect(mockFlush).not.toHaveBeenCalled();
  });
});
