/**
 * Tests for useSyncJobs — the foreground flush-then-pull sync. Covers the happy path (flush before
 * pull, syncing flag toggled, last-synced recorded), error surfacing, and the benign-cancel branch
 * (a user-cancelled sync must NOT surface as an error — the DB is left as-is).
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncJobs } from '../useSync';
import { pullJobs } from '../../database/sync/syncEngine';
import { flushOutbox } from '../../database/sync/outboxFlusher';

const mockSetLastSyncedAt = jest.fn();
const mockSetSyncing = jest.fn();

jest.mock('axios', () => ({ isCancel: (e: unknown) => Boolean(e && (e as { __isCancel?: boolean }).__isCancel) }));
jest.mock('../../database/sync/syncEngine', () => ({ pullJobs: jest.fn() }));
jest.mock('../../database/sync/outboxFlusher', () => ({ flushOutbox: jest.fn() }));
jest.mock('../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) =>
    sel({ setLastSyncedAt: mockSetLastSyncedAt, setSyncing: mockSetSyncing }),
}));

const mockPull = pullJobs as jest.Mock;
const mockFlush = flushOutbox as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlush.mockResolvedValue(undefined);
  mockPull.mockResolvedValue(undefined);
});

describe('useSyncJobs', () => {
  it('flushes the outbox BEFORE pulling, then records last-synced', async () => {
    const order: string[] = [];
    mockFlush.mockImplementation(async () => void order.push('flush'));
    mockPull.mockImplementation(async () => void order.push('pull'));

    const { result } = renderHook(() => useSyncJobs(), { wrapper });
    act(() => result.current.sync());

    await waitFor(() => expect(mockSetLastSyncedAt).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['flush', 'pull']); // flush-then-pull
    expect(mockSetSyncing).toHaveBeenCalledWith(true);
    expect(mockSetSyncing).toHaveBeenCalledWith(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a real sync error', async () => {
    mockPull.mockRejectedValue(new Error('pull failed'));
    const { result } = renderHook(() => useSyncJobs(), { wrapper });

    act(() => result.current.sync());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('pull failed');
    expect(mockSetSyncing).toHaveBeenLastCalledWith(false); // flag always reset
  });

  it('treats a cancelled sync as benign (no error, no last-synced write)', async () => {
    mockPull.mockRejectedValue({ __isCancel: true });
    const { result } = renderHook(() => useSyncJobs(), { wrapper });

    act(() => result.current.sync());
    await waitFor(() => expect(mockSetSyncing).toHaveBeenLastCalledWith(false));
    expect(result.current.error).toBeNull();
    expect(mockSetLastSyncedAt).not.toHaveBeenCalled();
  });
});
