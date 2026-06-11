/**
 * Optional auto-refresh polling (issue #13). Runs the foreground flush-then-pull sync on the
 * user-chosen interval from settingsStore. Polls only while it is useful: signed in, online,
 * app in the foreground, and no sync already in flight (skipped ticks are simply dropped —
 * the next tick catches up). Mounted once in the authenticated (app) layout.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useConnectivityStore } from '../stores/connectivityStore';
import { useSyncJobs } from './useSync';

export function useAutoRefresh(): void {
  const minutes = useSettingsStore((s) => s.autoRefreshMinutes);
  const status = useAuthStore((s) => s.status);
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const { sync } = useSyncJobs();
  // currentState can be null/'unknown' before the first native event (e.g. iOS cold start) —
  // the JS is clearly running in the foreground then, so only an explicit background counts.
  // Treat the app as foregrounded unless the OS has explicitly told us otherwise —
  // currentState can be null/'unknown' before the first native event (e.g. iOS cold start).
  const [appActive, setAppActive] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (minutes == null || status !== 'authenticated' || !isOnline || !appActive) return;
    const id = setInterval(() => {
      // Read syncing state at tick time (not as a dep) so an in-flight sync doesn't reset the timer.
      if (!useConnectivityStore.getState().isSyncing) sync();
    }, minutes * 60_000);
    return () => clearInterval(id);
  }, [minutes, status, isOnline, appActive, sync]);
}
