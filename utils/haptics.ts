import * as Haptics from 'expo-haptics';

/**
 * Confirmation haptics (spec: docs/proposals/ui-modernization-report.md §3.6).
 * Restraint is deliberate — success/error on confirmed writes, light impact on
 * navigation. Failures are swallowed: haptics must never break a flow
 * (e.g. emulator/device without a vibrator).
 */

export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // no-op — haptics unavailable
  }
}

export async function hapticError(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // no-op — haptics unavailable
  }
}

export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no-op — haptics unavailable
  }
}
