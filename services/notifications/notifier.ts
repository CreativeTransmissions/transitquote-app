/**
 * Notification presentation seam (spec §10 Option B).
 *
 * The change-detection engine (database/sync/changeDetector.ts) decides *what* to notify; this
 * module decides *how*. It is the single place that calls `expo-notifications` — paired with
 * setup.ts, which owns the handler/channel/permission.
 *
 * Two layers, by design:
 *  - the in-memory log (records intent regardless of OS permission — drives the in-app view and
 *    keeps tests/sync deterministic without the native module);
 *  - native firing (only when permission is 'granted'; failures are swallowed since the intent is
 *    already logged). Firing is fire-and-forget so `presentJobNotifications` stays synchronous for
 *    its caller in the sync cycle.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { JobChangeEvent } from '../../database/sync/changeDetector';
import { getNotificationPermission, NOTIFICATION_CHANNEL_ID } from './setup';

export interface PresentedNotification {
  title: string;
  body: string;
  jobId: number;
}

// In-memory record of what *would* have been presented — lets the UI surface an in-app banner and
// lets tests assert behaviour without the native module. Capped to avoid unbounded growth.
const MAX_LOG = 50;
const presentedLog: PresentedNotification[] = [];

export function presentJobNotifications(events: JobChangeEvent[]): PresentedNotification[] {
  const presented = events.map((e) => ({ title: e.title, body: e.body, jobId: e.jobId }));
  presentedLog.push(...presented);
  if (presentedLog.length > MAX_LOG) presentedLog.splice(0, presentedLog.length - MAX_LOG);
  fireLocalNotifications(presented);
  return presented;
}

/**
 * Deliver each notification through the OS. No-op unless permission was granted (the in-app log
 * still holds the intent). Fire-and-forget: rejections are swallowed — a missed local notification
 * is not worth surfacing, and the next sync re-detects unresolved changes.
 */
function fireLocalNotifications(items: PresentedNotification[]): void {
  if (getNotificationPermission() !== 'granted') return;
  for (const n of items) {
    Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { jobId: n.jobId } },
      trigger: Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : null,
    }).catch(() => {
      /* native module unavailable / transient failure — intent already recorded in the log */
    });
  }
}

/** Most recent presented notifications (newest last). Used by the in-app notifications view. */
export function getPresentedNotifications(): PresentedNotification[] {
  return [...presentedLog];
}

export function clearPresentedNotifications(): void {
  presentedLog.length = 0;
}
