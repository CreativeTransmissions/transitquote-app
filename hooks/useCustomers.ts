/**
 * Reactive customers (offline-first): reads from the local DB via `useLiveQuery` and triggers a
 * background pull on mount / connectivity restore. `useCustomerJobs` exposes a customer's job
 * history from the local jobs table.
 */
import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { customersListQuery, customerJobsQuery } from '../database/queries/customers';
import { pullCustomers } from '../database/sync/syncEngine';
import { useConnectivity } from './useConnectivity';
import type { CustomerRow, JobRow } from '../database/schema';

export interface UseCustomersResult {
  customers: CustomerRow[];
  dbError: Error | undefined;
  isSyncing: boolean;
  syncError: Error | null;
  refresh: () => void;
}

export function useCustomers(): UseCustomersResult {
  const { data, error } = useLiveQuery(customersListQuery());
  const isOnline = useConnectivity();
  const sync = useMutation<void, Error, void>({ mutationFn: () => pullCustomers() });
  const syncMutate = sync.mutate;

  useEffect(() => {
    if (isOnline) syncMutate();
  }, [isOnline, syncMutate]);

  return {
    customers: data,
    dbError: error,
    isSyncing: sync.isPending,
    syncError: sync.error,
    refresh: () => syncMutate(),
  };
}

export function useCustomerJobs(customerId: number): JobRow[] {
  const { data } = useLiveQuery(customerJobsQuery(customerId), [customerId]);
  return data;
}
