/**
 * Gesture-scoped pull-to-refresh state. The native RefreshControl spinner sits on top of the
 * list, so keeping it bound to `isSyncing` blocks the list for the whole flush→pull→hydrate
 * cycle. This hook shows the spinner only long enough to acknowledge the gesture; ongoing
 * sync progress is surfaced by the non-blocking RefreshingFooter / SyncStatusIndicator instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the RefreshControl spinner stays visible after the pull gesture (ms). */
const GESTURE_ACK_MS = 600;

export interface PullToRefresh {
  refreshing: boolean;
  onRefresh: () => void;
}

export function usePullToRefresh(refresh: () => void): PullToRefresh {
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRefreshing(false), GESTURE_ACK_MS);
  }, [refresh]);

  return { refreshing, onRefresh };
}
