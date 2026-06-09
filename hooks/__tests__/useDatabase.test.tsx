/**
 * Tests for useDatabase — wraps Drizzle's Expo useMigrations so the root layout can gate the UI on
 * a ready/error status while migrations run. useMigrations + the native client/bundle are mocked.
 */
import { renderHook } from '@testing-library/react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useDatabase } from '../useDatabase';

jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({ useMigrations: jest.fn() }));
jest.mock('../../database/client', () => ({ db: {} }));
jest.mock('../../database/migrations/bundle', () => ({ __esModule: true, default: {} }));

const mockUseMigrations = useMigrations as jest.Mock;

beforeEach(() => mockUseMigrations.mockReset());

describe('useDatabase', () => {
  it('maps a successful migration to ready', () => {
    mockUseMigrations.mockReturnValue({ success: true, error: undefined });
    expect(renderHook(() => useDatabase()).result.current).toEqual({ ready: true, error: undefined });
  });

  it('reports not-ready while migrations are still running', () => {
    mockUseMigrations.mockReturnValue({ success: false, error: undefined });
    expect(renderHook(() => useDatabase()).result.current).toEqual({ ready: false, error: undefined });
  });

  it('surfaces a migration error', () => {
    const error = new Error('migration failed');
    mockUseMigrations.mockReturnValue({ success: false, error });
    expect(renderHook(() => useDatabase()).result.current).toEqual({ ready: false, error });
  });
});
