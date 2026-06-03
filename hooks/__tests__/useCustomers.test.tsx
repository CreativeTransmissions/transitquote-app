/**
 * Tests for useCustomers / useCustomerJobs — offline-first reads from the local DB that trigger a
 * background pull on mount when online. useLiveQuery + connectivity + the pull are mocked so we
 * assert the wiring: render from the DB immediately, pull only when online, expose the UI states.
 */
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../database/queries/customers', () => ({
  customersListQuery: jest.fn(() => 'q:customers'),
  customerJobsQuery: jest.fn((id: number) => `q:customerJobs:${id}`),
}));
jest.mock('../../database/sync/syncEngine', () => ({ pullCustomers: jest.fn() }));
jest.mock('../useConnectivity', () => ({ useConnectivity: jest.fn() }));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { customerJobsQuery } from '../../database/queries/customers';
import { pullCustomers } from '../../database/sync/syncEngine';
import { useConnectivity } from '../useConnectivity';
import { useCustomers, useCustomerJobs } from '../useCustomers';

const mockLive = useLiveQuery as jest.Mock;
const mockPull = pullCustomers as jest.Mock;
const mockConn = useConnectivity as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.mockReturnValue({ data: [{ id: 1 }], error: undefined });
  mockPull.mockResolvedValue(undefined);
  mockConn.mockReturnValue(true);
});

describe('useCustomers', () => {
  it('renders customers from the DB and pulls in the background when online', async () => {
    const { result } = renderHook(() => useCustomers(), { wrapper });
    expect(result.current.customers).toEqual([{ id: 1 }]);
    await waitFor(() => expect(mockPull).toHaveBeenCalledTimes(1));
  });

  it('does not pull while offline', () => {
    mockConn.mockReturnValue(false);
    renderHook(() => useCustomers(), { wrapper });
    expect(mockPull).not.toHaveBeenCalled();
  });

  it('surfaces a sync error from the pull', async () => {
    mockPull.mockRejectedValue(new Error('pull failed'));
    const { result } = renderHook(() => useCustomers(), { wrapper });
    await waitFor(() => expect(result.current.syncError).not.toBeNull());
    expect(result.current.syncError?.message).toBe('pull failed');
  });
});

describe('useCustomerJobs', () => {
  it('queries the local jobs for the given customer id', () => {
    mockLive.mockReturnValue({ data: [{ id: 10 }, { id: 11 }], error: undefined });
    const { result } = renderHook(() => useCustomerJobs(99));
    expect(customerJobsQuery).toHaveBeenCalledWith(99);
    expect(result.current).toHaveLength(2);
  });
});
