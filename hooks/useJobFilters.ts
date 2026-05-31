/**
 * Job filter state, persisted locally so the last-used filter is restored next launch (spec §6.4).
 * AsyncStorage is the right store here — filters are not sensitive (tokens/creds live in
 * expo-secure-store). Filtering itself is applied client-side via utils/jobFilter.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_FILTERS, type JobFilters } from '../utils/jobFilter';

const STORAGE_KEY = 'tq.jobFilters';

export interface UseJobFiltersResult {
  filters: JobFilters;
  isLoaded: boolean;
  setFilters: (next: JobFilters) => void;
  clear: () => void;
}

export function useJobFilters(): UseJobFiltersResult {
  const [filters, setFiltersState] = useState<JobFilters>(EMPTY_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            setFiltersState({ ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<JobFilters>) });
          } catch {
            /* ignore malformed persisted filters — fall back to empty */
          }
        }
        setIsLoaded(true);
      })
      .catch(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: JobFilters) => {
    setFiltersState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      /* best-effort persistence; in-memory state is already updated */
    });
  }, []);

  const clear = useCallback(() => persist(EMPTY_FILTERS), [persist]);

  return { filters, isLoaded, setFilters: persist, clear };
}
