/**
 * Tests for the thin reactive read hooks that wrap a single useLiveQuery: useCurrentUser,
 * useTeamSettings, useStatusTypes, useDriverJobCounts. Each returns null/empty before configuration
 * is seeded and otherwise passes the DB rows through (useDriverJobCounts via the real counter util).
 */
jest.mock('../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCurrentUser } from '../useCurrentUser';
import { useTeamSettings } from '../useTeamSettings';
import { useStatusTypes } from '../useStatusTypes';
import { useDriverJobCounts } from '../useDriverJobCounts';

const mockLive = useLiveQuery as jest.Mock;
const feed = (data: unknown[]) => mockLive.mockReturnValue({ data, error: undefined });

beforeEach(() => mockLive.mockReset());

describe('useCurrentUser', () => {
  it('returns null before configuration is seeded', () => {
    feed([]);
    expect(renderHook(() => useCurrentUser()).result.current).toBeNull();
  });
  it('returns the single user row', () => {
    feed([{ id: 1, firstName: 'Ada' }]);
    expect(renderHook(() => useCurrentUser()).result.current).toMatchObject({ firstName: 'Ada' });
  });
});

describe('useTeamSettings', () => {
  it('returns null when settings are absent', () => {
    feed([]);
    expect(renderHook(() => useTeamSettings()).result.current).toBeNull();
  });
  it('returns the single settings row', () => {
    feed([{ id: 1, assignmentMode: 'Decentralized' }]);
    expect(renderHook(() => useTeamSettings()).result.current).toMatchObject({
      assignmentMode: 'Decentralized',
    });
  });
});

describe('useStatusTypes', () => {
  it('passes the status-type rows through', () => {
    feed([{ id: 1, name: 'Booked' }, { id: 2, name: 'Delivered' }]);
    expect(renderHook(() => useStatusTypes()).result.current.map((s) => s.name)).toEqual([
      'Booked',
      'Delivered',
    ]);
  });
});

describe('useDriverJobCounts', () => {
  it('counts jobs per assigned driver (ignoring unassigned)', () => {
    feed([
      { id: 1, driverId: 7 },
      { id: 2, driverId: 7 },
      { id: 3, driverId: 9 },
      { id: 4, driverId: null },
    ]);
    const counts = renderHook(() => useDriverJobCounts()).result.current;
    expect(counts.get(7)).toBe(2);
    expect(counts.get(9)).toBe(1);
    expect(counts.has(null as unknown as number)).toBe(false);
  });
});
