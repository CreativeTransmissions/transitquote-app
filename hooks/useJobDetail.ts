/**
 * Reactive job detail (offline-first): reads the job row + hydrated detail from the local DB and
 * triggers a per-job detail pull (GET /jobs?id=) on mount / connectivity restore, since the list
 * never carries nested data.
 */
import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { jobByIdQuery, jobDetailByIdQuery } from '../database/queries/jobs';
import { pullJobDetail } from '../database/sync/syncEngine';
import { useConnectivity } from './useConnectivity';
import type { JobRow, JobDetailRow } from '../database/schema';

export interface UseJobDetailResult {
  job: JobRow | null;
  detail: JobDetailRow | null;
  isOnline: boolean;
  isHydrating: boolean;
  error: Error | null;
}

export function useJobDetail(id: number): UseJobDetailResult {
  const { data: jobRows } = useLiveQuery(jobByIdQuery(id), [id]);
  const { data: detailRows } = useLiveQuery(jobDetailByIdQuery(id), [id]);
  const isOnline = useConnectivity();

  const hydrate = useMutation<void, Error, void>({ mutationFn: () => pullJobDetail(id) });
  const hydrateMutate = hydrate.mutate;

  useEffect(() => {
    if (isOnline) hydrateMutate();
  }, [isOnline, hydrateMutate, id]);

  return {
    job: jobRows.at(0) ?? null,
    detail: detailRows.at(0) ?? null,
    isOnline,
    isHydrating: hydrate.isPending,
    error: hydrate.error,
  };
}
