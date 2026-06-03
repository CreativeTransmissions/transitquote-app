/**
 * Tests for useJobDetail — reads a job row + its hydrated detail from the local DB and triggers a
 * per-job detail pull (GET /jobs?id=) on mount when online, since the list never carries nested
 * data. useLiveQuery is keyed by the query it receives (job vs detail) so re-renders stay stable;
 * connectivity and the pull are mocked.
 */
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../database/queries/jobs', () => ({
  jobByIdQuery: jest.fn((id: number) => ({ kind: 'job', id })),
  jobDetailByIdQuery: jest.fn((id: number) => ({ kind: 'detail', id })),
}));
jest.mock('../../database/sync/syncEngine', () => ({ pullJobDetail: jest.fn() }));
jest.mock('../useConnectivity', () => ({ useConnectivity: jest.fn() }));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { pullJobDetail } from '../../database/sync/syncEngine';
import { useConnectivity } from '../useConnectivity';
import { useJobDetail } from '../useJobDetail';

const mockLive = useLiveQuery as jest.Mock;
const mockPull = pullJobDetail as jest.Mock;
const mockConn = useConnectivity as jest.Mock;

let jobRows: unknown[];
let detailRows: unknown[];

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  jobRows = [{ id: 5, jobRef: 'JOB-5' }];
  detailRows = [{ jobId: 5, hydratedAt: '2026-06-03 10:00:00' }];
  mockConn.mockReturnValue(true);
  mockPull.mockResolvedValue(undefined);
  mockLive.mockImplementation((q: { kind: string }) =>
    q.kind === 'job' ? { data: jobRows, error: undefined } : { data: detailRows, error: undefined },
  );
});

describe('useJobDetail', () => {
  it('returns the job row and its hydrated detail', () => {
    const { result } = renderHook(() => useJobDetail(5), { wrapper });
    expect(result.current.job).toMatchObject({ id: 5, jobRef: 'JOB-5' });
    expect(result.current.detail).toMatchObject({ jobId: 5 });
  });

  it('returns null for job/detail when the local rows are empty', () => {
    jobRows = [];
    detailRows = [];
    const { result } = renderHook(() => useJobDetail(5), { wrapper });
    expect(result.current.job).toBeNull();
    expect(result.current.detail).toBeNull();
  });

  it('hydrates the detail from the network on mount when online', async () => {
    renderHook(() => useJobDetail(5), { wrapper });
    await waitFor(() => expect(mockPull).toHaveBeenCalledWith(5));
  });

  it('does not hydrate while offline', () => {
    mockConn.mockReturnValue(false);
    renderHook(() => useJobDetail(5), { wrapper });
    expect(mockPull).not.toHaveBeenCalled();
  });

  it('surfaces a hydration error', async () => {
    mockPull.mockRejectedValue(new Error('detail failed'));
    const { result } = renderHook(() => useJobDetail(5), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('detail failed');
  });
});
