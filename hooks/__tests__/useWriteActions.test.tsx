/**
 * Tests for the offline-first write hooks (useUpdateJobStatus, useAssignDriver). Both follow the
 * same contract: queue the optimistic write + outbox action atomically, then best-effort flush.
 * The flush is best-effort — offline it leaves the item pending and the mutation STILL resolves
 * (the optimistic UI is already correct); only a thrown error from the queue/flush surfaces.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateJobStatus } from '../useUpdateJobStatus';
import { useAssignDriver } from '../useAssignDriver';
import { queueStatusUpdate, queueAssignment } from '../../database/queries/writeActions';
import { flushOutbox } from '../../database/sync/outboxFlusher';

jest.mock('../../database/queries/writeActions', () => ({
  queueStatusUpdate: jest.fn(),
  queueAssignment: jest.fn(),
}));
jest.mock('../../database/sync/outboxFlusher', () => ({ flushOutbox: jest.fn() }));

const mockQueueStatus = queueStatusUpdate as jest.Mock;
const mockQueueAssign = queueAssignment as jest.Mock;
const mockFlush = flushOutbox as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlush.mockResolvedValue(undefined);
});

describe('useUpdateJobStatus', () => {
  it('queues the optimistic status + outbox action, then flushes', async () => {
    const { result } = renderHook(() => useUpdateJobStatus(), { wrapper });
    await result.current.mutateAsync({ jobId: 1, statusTypeId: 5, statusName: 'Delivered' });

    expect(mockQueueStatus).toHaveBeenCalledWith(1, 5, 'Delivered');
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });

  it('still resolves when offline (flush leaves the item pending, does not reject)', async () => {
    // Offline: flushOutbox resolves without sending (the item stays pending for the next sync).
    mockFlush.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateJobStatus(), { wrapper });

    await expect(
      result.current.mutateAsync({ jobId: 1, statusTypeId: 5, statusName: null }),
    ).resolves.toBeUndefined();
  });

  it('surfaces an error if the atomic queue write throws', async () => {
    mockQueueStatus.mockImplementation(() => {
      throw new Error('db write failed');
    });
    const { result } = renderHook(() => useUpdateJobStatus(), { wrapper });

    await expect(
      result.current.mutateAsync({ jobId: 1, statusTypeId: 5, statusName: null }),
    ).rejects.toThrow('db write failed');
    expect(mockFlush).not.toHaveBeenCalled();
  });
});

describe('useAssignDriver', () => {
  it('queues the optimistic assignment + outbox action, then flushes', async () => {
    const { result } = renderHook(() => useAssignDriver(), { wrapper });
    await result.current.mutateAsync({ jobId: 2, driverId: 42, driverName: 'Pat' });

    expect(mockQueueAssign).toHaveBeenCalledWith(2, 42, 'Pat');
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });

  it('exposes the error state when the flush rejects unexpectedly', async () => {
    mockFlush.mockRejectedValue(new Error('unexpected'));
    const { result } = renderHook(() => useAssignDriver(), { wrapper });

    result.current.mutate({ jobId: 2, driverId: 42, driverName: 'Pat' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('unexpected');
  });
});
