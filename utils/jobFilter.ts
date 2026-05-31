/**
 * Pure job-filtering helpers (spec §6.4 filter sheet). Filtering runs client-side over the local
 * DB list — the offline-first UI never refetches to filter. Kept pure so it's unit-testable and
 * reusable by the list screen and the active-count badge.
 */
import dayjs from 'dayjs';
import type { JobRow } from '../database/schema';

export interface JobFilters {
  /** Status type ids to include (OR). Empty = all statuses. */
  statusIds: number[];
  /** Driver id to include, or null for any (Dispatcher/Admin only). */
  driverId: number | null;
  /** Inclusive scheduled-date range as YYYY-MM-DD strings, or null. */
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_FILTERS: JobFilters = { statusIds: [], driverId: null, dateFrom: null, dateTo: null };

/** Number of active filter groups, for the toolbar badge (status / driver / date each count once). */
export function countActiveFilters(f: JobFilters): number {
  let n = 0;
  if (f.statusIds.length > 0) n += 1;
  if (f.driverId != null) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  return n;
}

type FilterableJob = Pick<JobRow, 'statusTypeId' | 'driverId' | 'deliveryTime'>;

/** Apply filters to a job list. Returns the input type so callers keep their full JobRow. */
export function applyJobFilters<T extends FilterableJob>(jobs: T[], f: JobFilters): T[] {
  return jobs.filter((job) => {
    if (f.statusIds.length > 0 && (job.statusTypeId == null || !f.statusIds.includes(job.statusTypeId))) {
      return false;
    }
    if (f.driverId != null && job.driverId !== f.driverId) return false;
    if (f.dateFrom || f.dateTo) {
      const d = job.deliveryTime ? dayjs(job.deliveryTime) : null;
      if (!d || !d.isValid()) return false;
      if (f.dateFrom && d.isBefore(dayjs(f.dateFrom), 'day')) return false;
      if (f.dateTo && d.isAfter(dayjs(f.dateTo), 'day')) return false;
    }
    return true;
  });
}
