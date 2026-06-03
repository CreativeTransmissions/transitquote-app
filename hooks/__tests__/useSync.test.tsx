/**
 * Tests for useSyncJobs — the foreground flush-then-pull sync. Covers the happy path (flush before
 * pull, syncing flag toggled, last-synced recorded), error surfacing, and the benign-cancel branch
 * (a user-cancelled sync must NOT surface as an error — the DB is left as-is).
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncJobs } from '../useSync';
import { pullJobs, hydrateJobDetails } from '../../database/sync/syncEngine';
import { flushOutbox } from '../../database/sync/outboxFlusher';

const mockSetLastSyncedAt = jest.fn();
const mockSetSyncing = jest.fn();
const mockSetDetailHydration = jest.fn();

jest.mock('axios', () => ({ isCancel: (e: unknown) => Boolean(e && (e as { __isCancel?: boolean }).__isCancel) }));
jest.mock('../../database/sync/syncEngine', () => ({ pullJobs: jest.fn(), hydrateJobDetails: jest.fn() }));
jest.mock('../../database/sync/outboxFlusher', () => ({ flushOutbox: jest.fn() }));
jest.mock('../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) =>
    sel({
      setLastSyncedAt: mockSetLastSyncedAt,
      setSyncing: mockSetSyncing,
      setDetailHydration: mockSetDetailHydration,
    }),
}));

const mockPull = pullJobs as jest.Mock;
const mockHydrate = hydrateJobDetails as jest.Mock;
const mockFlush = flushOutbox as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlush.mockResolvedValue(undefined);
  mockPull.mockResolvedValue(undefined);
  mockHydrate.mockResolvedValue(undefined);
});

describe('useSyncJobs', () => {
  it('flushes, pulls the list, records last-synced, THEN hydrates detail', async () => {
    const order: string[] = [];
    mockFlush.mockImplementation(async () => void order.push('flush'));
    mockPull.mockImplementation(async () => void order.push('pull'));
    mockHydrate.mockImplementation(async () => void order.push('hydrate'));

    const { result } = renderHook(() => useSyncJobs(), { wrapper });
    act(() => result.current.sync());

    await waitFor(() => expect(mockHydrate).toHaveBeenCalledTimes(1));
    // flush → pull → hydrate; last-synced is recorded after the list pull (before background detail).
    expect(order).toEqual(['flush', 'pull', 'hydrate']);
    expect(mockSetLastSyncedAt).toHaveBeenCalledTimes(1);
    expect(mockSetSyncing).toHaveBeenCalledWith(true);
    expect(mockSetSyncing).toHaveBeenCalledWith(false);
    // The detail-hydration progress slot is always cleared when the sync settles.
    expect(mockSetDetailHydration).toHaveBeenLastCalledWith(null);
    expect(result.current.error).toBeNull();
  });

  it('threads the abort signal into both the list pull and the detail hydration', async () => {
    const { result } = renderHook(() => useSyncJobs(), { wrapper });
    act(() => result.current.sync());

    await waitFor(() => expect(mockHydrate).toHaveBeenCalledTimes(1));
    const pullSignal = mockPull.mock.calls[0][0];
    const hydrateSignal = mockHydrate.mock.calls[0][0];
    expect(pullSignal).toBeInstanceOf(AbortSignal);
    expect(hydrateSignal).toBe(pullSignal); // same controller for the whole sync
  });

  it('forwards detail-hydration progress to the connectivity store', async () => {
    mockHydrate.mockImplementation(async (_signal, onProgress?: (d: number, t: number) => void) => {
      onProgress?.(1, 2);
      onProgress?.(2, 2);
    });

    const { result } = renderHook(() => useSyncJobs(), { wrapper });
    act(() => result.current.sync());

    await waitFor(() => expect(mockHydrate).toHaveBeenCalledTimes(1));
    expect(mockSetDetailHydration).toHaveBeenCalledWith({ done: 1, total: 2 });
    expect(mockSetDetailHydration).toHaveBeenCalledWith({ done: 2, total: 2 });
    expect(mockSetDetailHydration).toHaveBeenLastCalledWith(null); // cleared in finally
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
