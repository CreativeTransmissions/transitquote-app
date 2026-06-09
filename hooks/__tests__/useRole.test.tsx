/**
 * Tests for useRole — derives role + assignment mode reactively from the local DB. Role comes from
 * the roles ARRAY (never display strings — CLAUDE.md §4); role is null until configuration is
 * seeded. The DB client is the better-sqlite3 harness (query builders are constructed but ignored);
 * useLiveQuery is mocked to feed the current_user / team_settings rows under test.
 */
import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRole } from '../useRole';

jest.mock('../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

const mockLive = useLiveQuery as jest.Mock;

/** useRole calls useLiveQuery twice in order: current_user, then team_settings. */
function feed(userRows: unknown[], settingsRows: unknown[]) {
  mockLive
    .mockReturnValueOnce({ data: userRows, error: undefined })
    .mockReturnValueOnce({ data: settingsRows, error: undefined });
}

beforeEach(() => mockLive.mockReset());

describe('useRole', () => {
  it('returns role: null before configuration is seeded (no user row)', () => {
    feed([], []);
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBeNull();
    expect(result.current.isDriver).toBe(false);
    expect(result.current.isDispatcher).toBe(false);
    expect(result.current.assignmentMode).toBe('Centralized'); // default when settings absent
  });

  it('resolves a driver from the roles array', () => {
    feed([{ roles: ['driver'], driverId: 42 }], [{ assignmentMode: 'Decentralized' }]);
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe('driver');
    expect(result.current.isDriver).toBe(true);
    expect(result.current.isDispatcher).toBe(false);
    expect(result.current.driverId).toBe(42);
    expect(result.current.isDecentralized).toBe(true);
  });

  it('treats an administrator as a dispatcher for UI gating', () => {
    feed([{ roles: ['administrator'], driverId: null }], [{ assignmentMode: 'Centralized' }]);
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe('administrator');
    expect(result.current.isDispatcher).toBe(true);
    expect(result.current.isDecentralized).toBe(false);
  });

  it('exposes the dispatch role', () => {
    feed([{ roles: ['dispatch'], driverId: null }], [{}]);
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe('dispatch');
    expect(result.current.isDispatcher).toBe(true);
  });
});
