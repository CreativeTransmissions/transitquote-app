/**
 * Tests for usePullToRefresh (#12) — the gesture-scoped RefreshControl state. The spinner shows
 * on pull, the refresh callback fires, and the spinner dismisses after the short acknowledgement
 * window rather than tracking the whole sync.
 */
import { act, renderHook } from '@testing-library/react-native';
import { usePullToRefresh } from '../usePullToRefresh';

describe('usePullToRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts not refreshing', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn()));
    expect(result.current.refreshing).toBe(false);
  });

  it('shows the spinner and triggers the refresh on pull', () => {
    const refresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(refresh));

    act(() => result.current.onRefresh());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(true);
  });

  it('dismisses the spinner after the acknowledgement window, not the sync duration', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn()));

    act(() => result.current.onRefresh());
    expect(result.current.refreshing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(result.current.refreshing).toBe(false);
  });

  it('restarts the window when pulled again mid-window', () => {
    const refresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(refresh));

    act(() => result.current.onRefresh());
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => result.current.onRefresh());
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.refreshing).toBe(false);
  });

  it('cleans up the pending timer on unmount', () => {
    const { result, unmount } = renderHook(() => usePullToRefresh(jest.fn()));
    act(() => result.current.onRefresh());
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0); // the ack timer was cleared, not left to fire
  });
});
