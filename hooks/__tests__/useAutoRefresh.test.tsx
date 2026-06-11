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

beforeEach(() => {
  jest.useFakeTimers();
  sync.mockClear();
  mockUseSyncJobs.mockReturnValue({ sync, cancel: jest.fn(), isSyncing: false, error: null });
  useSettingsStore.setState({ autoRefreshMinutes: null });
  useAuthStore.setState({ status: 'authenticated' });
  useConnectivityStore.setState({ isOnline: true, isSyncing: false });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
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
