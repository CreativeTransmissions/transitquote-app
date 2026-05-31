/**
 * Notification presentation seam (spec §10 Option B).
 *
 * The change-detection engine (database/sync/changeDetector.ts) decides *what* to notify; this
 * module decides *how*. It is deliberately the single place that will call `expo-notifications`.
 *
 * ⚠️ DEFERRED: `expo-notifications` is a native module requiring a dev-client rebuild, and it
 * can't be verified until the Android emulator blocker (docs/STATUS.md) is cleared — consistent
 * with the project's "no unverified native deps while blocked" stance. Until then this is a safe
 * no-op that records intent via the in-memory log below, so the sync wiring and tests are real and
 * the swap is a one-function change:
 *
 *   import * as Notifications from 'expo-notifications';
 *   await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
 *
 * See BACKLOG "M4 — native notification firing".
 */
import type { JobChangeEvent } from '../../database/sync/changeDetector';

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
  return presented;
}

/** Most recent presented notifications (newest last). Used by the in-app notifications view. */
export function getPresentedNotifications(): PresentedNotification[] {
  return [...presentedLog];
}

export function clearPresentedNotifications(): void {
  presentedLog.length = 0;
}
