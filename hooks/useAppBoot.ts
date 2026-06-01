/**
 * Boot sequence: apply DB migrations, then hydrate the session from secure storage.
 * Returns a single status the root layout can gate the UI on. Owns the boot orchestration so
 * the gate component stays render-only (CLAUDE.md separation of concerns).
 */
import { useEffect } from 'react';
import { useDatabase } from './useDatabase';
import { useAuthStore } from '../stores/authStore';
import { configureNotifications, ensureNotificationPermission } from '../services/notifications/setup';

export type BootStatus = 'booting' | 'error' | 'ready';

export interface AppBoot {
  status: BootStatus;
  error: Error | undefined;
}

export function useAppBoot(): AppBoot {
  const { ready, error } = useDatabase();
  const hydrate = useAuthStore((s) => s.hydrate);
  const authStatus = useAuthStore((s) => s.status);

  // Hydrate the session only once migrations have completed.
  useEffect(() => {
    if (ready) void hydrate();
  }, [ready, hydrate]);

  // Configure local notifications + request permission once the DB is ready. Fire-and-forget:
  // notifications are non-critical, so this never gates or fails the boot (spec §10 Option B).
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      await configureNotifications();
      await ensureNotificationPermission();
    })();
  }, [ready]);

  if (error) return { status: 'error', error };
  if (!ready || authStatus === 'loading') return { status: 'booting', error: undefined };
  return { status: 'ready', error: undefined };
}
