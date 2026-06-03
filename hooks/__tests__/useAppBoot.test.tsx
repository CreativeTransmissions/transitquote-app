/**
 * Tests for useAppBoot — gates the UI on migrations + session hydration and fires (non-blocking)
 * notification setup once the DB is ready. A DB error wins; otherwise booting until the DB is ready
 * AND the session is no longer loading. useDatabase, the auth store, and notification setup are mocked.
 */
const mockHydrate = jest.fn();
let mockAuthStatus: string;
const mockConfigureNotifications = jest.fn();
const mockEnsurePermission = jest.fn();

jest.mock('../useDatabase', () => ({ useDatabase: jest.fn() }));
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ hydrate: mockHydrate, status: mockAuthStatus }),
}));
jest.mock('../../services/notifications/setup', () => ({
  configureNotifications: () => mockConfigureNotifications(),
  ensureNotificationPermission: () => mockEnsurePermission(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useDatabase } from '../useDatabase';
import { useAppBoot } from '../useAppBoot';

const mockUseDatabase = useDatabase as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthStatus = 'ready';
  mockHydrate.mockResolvedValue(undefined);
  mockConfigureNotifications.mockResolvedValue(undefined);
  mockEnsurePermission.mockResolvedValue(undefined);
});

describe('useAppBoot', () => {
  it('reports error when the DB migration fails', () => {
    mockUseDatabase.mockReturnValue({ ready: false, error: new Error('db') });
    expect(renderHook(() => useAppBoot()).result.current.status).toBe('error');
  });

  it('reports booting while migrations are still running', () => {
    mockUseDatabase.mockReturnValue({ ready: false, error: undefined });
    expect(renderHook(() => useAppBoot()).result.current.status).toBe('booting');
  });

  it('reports booting while the session is still hydrating', () => {
    mockUseDatabase.mockReturnValue({ ready: true, error: undefined });
    mockAuthStatus = 'loading';
    expect(renderHook(() => useAppBoot()).result.current.status).toBe('booting');
  });

  it('reports ready once the DB is ready and the session has hydrated, and sets up notifications', async () => {
    mockUseDatabase.mockReturnValue({ ready: true, error: undefined });
    mockAuthStatus = 'ready';

    const { result } = renderHook(() => useAppBoot());

    expect(result.current.status).toBe('ready');
    await waitFor(() => expect(mockHydrate).toHaveBeenCalled());
    await waitFor(() => expect(mockConfigureNotifications).toHaveBeenCalled());
    expect(mockEnsurePermission).toHaveBeenCalled();
  });

  it('does not hydrate or set up notifications until the DB is ready', () => {
    mockUseDatabase.mockReturnValue({ ready: false, error: undefined });
    renderHook(() => useAppBoot());
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockConfigureNotifications).not.toHaveBeenCalled();
  });
});
