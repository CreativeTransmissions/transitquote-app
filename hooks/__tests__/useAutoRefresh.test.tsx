/**
 * Tests for useAutoRefresh (issue #13) — interval polling driven by the persisted setting.
 * Real zustand stores (state set directly); useSyncJobs and AppState are mocked. Covers: off by
 * default, ticking at the chosen interval, and pausing when offline / signed out / an existing
 * sync is in flight.
 */
import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAutoRefresh } from '../useAutoRefresh';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { useSyncJobs } from '../useSync';

jest.mock('../useSync', () => ({ useSyncJobs: jest.fn() }));

const mockUseSyncJobs = useSyncJobs as jest.Mock;
const sync = jest.fn();
let appStateHandler: ((state: string) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers();
  sync.mockClear();
  mockUseSyncJobs.mockReturnValue({ sync, cancel: jest.fn(), isSyncing: false, error: null });
  useSettingsStore.setState({ autoRefreshMinutes: null });
  useAuthStore.setState({ status: 'authenticated' });
  useConnectivityStore.setState({ isOnline: true, isSyncing: false });
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (s: string) => void) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const minutes = (n: number) => n * 60_000;

describe('useAutoRefresh', () => {
  it('does not poll when the setting is off', () => {
    renderHook(() => useAutoRefresh());
    act(() => {
      jest.advanceTimersByTime(minutes(120));
    });
    expect(sync).not.toHaveBeenCalled();
  });

  it('syncs on every tick of the chosen interval', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 5 });
    renderHook(() => useAutoRefresh());
    act(() => {
      jest.advanceTimersByTime(minutes(5));
    });
    expect(sync).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(minutes(10));
    });
    expect(sync).toHaveBeenCalledTimes(3);
  });

  it('does not poll while offline', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 1 });
    useConnectivityStore.setState({ isOnline: false });
    renderHook(() => useAutoRefresh());
    act(() => {
      jest.advanceTimersByTime(minutes(5));
    });
    expect(sync).not.toHaveBeenCalled();
  });

  it('does not poll when not authenticated', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 1 });
    useAuthStore.setState({ status: 'unauthenticated' });
    renderHook(() => useAutoRefresh());
    act(() => {
      jest.advanceTimersByTime(minutes(5));
    });
    expect(sync).not.toHaveBeenCalled();
  });

  it('skips a tick while a sync is already in flight', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 1 });
    renderHook(() => useAutoRefresh());
    act(() => {
      useConnectivityStore.setState({ isSyncing: true });
      jest.advanceTimersByTime(minutes(1));
    });
    expect(sync).not.toHaveBeenCalled();
    act(() => {
      useConnectivityStore.setState({ isSyncing: false });
      jest.advanceTimersByTime(minutes(1));
    });
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('pauses in the background and runs a catch-up sync on foreground resume', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 30 });
    renderHook(() => useAutoRefresh());

    act(() => appStateHandler!('background'));
    act(() => {
      jest.advanceTimersByTime(minutes(120)); // no ticks while backgrounded
    });
    expect(sync).not.toHaveBeenCalled();

    act(() => appStateHandler!('active'));
    expect(sync).toHaveBeenCalledTimes(1); // immediate catch-up, not a fresh 30-min wait
  });

  it('skips the resume catch-up while a sync is already in flight', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 30 });
    renderHook(() => useAutoRefresh());
    act(() => appStateHandler!('background'));
    act(() => {
      useConnectivityStore.setState({ isSyncing: true });
      appStateHandler!('active');
    });
    expect(sync).not.toHaveBeenCalled();
  });

  it('stops polling when the setting is turned off', () => {
    useSettingsStore.setState({ autoRefreshMinutes: 1 });
    renderHook(() => useAutoRefresh());
    act(() => {
      jest.advanceTimersByTime(minutes(1));
    });
    expect(sync).toHaveBeenCalledTimes(1);
    act(() => {
      useSettingsStore.setState({ autoRefreshMinutes: null });
    });
    act(() => {
      jest.advanceTimersByTime(minutes(10));
    });
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
