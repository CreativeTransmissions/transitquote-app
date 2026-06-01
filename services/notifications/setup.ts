/**
 * Native notification setup (spec §10 Option B — local notifications).
 *
 * Owns the one-time `expo-notifications` configuration: the foreground presentation handler, the
 * Android delivery channel, and the OS permission request. Kept separate from notifier.ts so the
 * "what to fire" (notifier) and "is firing possible" (here) concerns stay decoupled.
 *
 * Permission is tracked as CLAUDE.md's three states: not-asked | denied | granted. When not
 * granted, notifier.ts still records intent in its in-memory log — the in-app view degrades
 * gracefully rather than the feature failing.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission = 'not-asked' | 'denied' | 'granted';

export const NOTIFICATION_CHANNEL_ID = 'job-updates';

let configured = false;
let permission: NotificationPermission = 'not-asked';

/** Last resolved OS permission state. Synchronous so notifier.ts can gate firing cheaply. */
export function getNotificationPermission(): NotificationPermission {
  return permission;
}

/**
 * Install the foreground handler + Android channel. Idempotent and permission-independent —
 * safe to call at boot before (or without) the user granting permission.
 */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Job updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * Request OS notification permission once, caching the resolved state. Re-querying when already
 * granted is cheap; a permanent denial (`canAskAgain === false`) is not re-prompted.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    permission = 'granted';
    return permission;
  }
  if (!current.canAskAgain) {
    permission = 'denied';
    return permission;
  }
  const requested = await Notifications.requestPermissionsAsync();
  permission = requested.granted ? 'granted' : 'denied';
  return permission;
}
