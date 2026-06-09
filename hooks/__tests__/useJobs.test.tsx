/**
 * Tests for useJobs — selects the right local query for the scope, exposes the four UI states, and
 * triggers a background sync when online. The query builders, useLiveQuery, connectivity and the
 * sync hook are mocked so we assert the WIRING (which builder, the unknown-driver guard, when sync
 * fires), not their internals.
 */
import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { jobsListQuery, availableJobsQuery, myJobsQuery } from '../../database/queries/jobs';
import { useConnectivity } from '../useConnectivity';
import { useSyncJobs } from '../useSync';
import { useJobs } from '../useJobs';

jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../database/queries/jobs', () => ({
  jobsListQuery: jest.fn(() => 'q:all'),
  availableJobsQuery: jest.fn(() => 'q:available'),
  myJobsQuery: jest.fn((id: number) => `q:mine:${id}`),
}));
jest.mock('../useConnectivity', () => ({ useConnectivity: jest.fn() }));
jest.mock('../useSync', () => ({ useSyncJobs: jest.fn() }));

const mockLive = useLiveQuery as jest.Mock;
const mockConnectivity = useConnectivity as jest.Mock;
const mockUseSync = useSyncJobs as jest.Mock;
const sync = jest.fn();
const cancel = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.mockReturnValue({ data: [{ id: 1 }], error: undefined });
  mockConnectivity.mockReturnValue(true);
  mockUseSync.mockReturnValue({ sync, cancel, isSyncing: false, error: null });
});

describe('useJobs — scope → query selection', () => {
  it('uses the full list query for the default/all scope', () => {
    renderHook(() => useJobs('all'));
    expect(jobsListQuery).toHaveBeenCalled();
    expect(availableJobsQuery).not.toHaveBeenCalled();
  });

  it('uses the available (unassigned) query for the available scope', () => {
    renderHook(() => useJobs('available'));
    expect(availableJobsQuery).toHaveBeenCalled();
  });

  it('uses myJobsQuery with the driver id for the mine scope', () => {
    renderHook(() => useJobs('mine', 7));
    expect(myJobsQuery).toHaveBeenCalledWith(7);
  });

  it('guards an unknown driver with -1 (yields a correct empty list) for the mine scope', () => {
    renderHook(() => useJobs('mine', null));
    expect(myJobsQuery).toHaveBeenCalledWith(-1);
  });
});

describe('useJobs — sync triggering + exposed state', () => {
  it('starts a background sync on mount when online', () => {
    renderHook(() => useJobs('all'));
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('does NOT sync while offline', () => {
    mockConnectivity.mockReturnValue(false);
    renderHook(() => useJobs('all'));
    expect(sync).not.toHaveBeenCalled();
  });

  it('exposes jobs, connectivity, and sync state, wiring refresh/cancel to the sync hook', () => {
    mockLive.mockReturnValue({ data: [{ id: 1 }, { id: 2 }], error: new Error('db') });
    mockUseSync.mockReturnValue({ sync, cancel, isSyncing: true, error: new Error('sync') });

    const { result } = renderHook(() => useJobs('all'));
    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.dbError?.message).toBe('db');
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.syncError?.message).toBe('sync');

    result.current.refresh();
    result.current.cancelSync();
    expect(sync).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });
});
