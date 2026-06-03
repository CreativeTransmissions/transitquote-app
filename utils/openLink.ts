/**
 * Open an external deep-link (`tel:`, `mailto:`, `https:` maps) and report whether the OS
 * had a handler. Kept separate from `links.ts` (which is pure URL building) because this does I/O.
 *
 * Deliberately does NOT pre-check `Linking.canOpenURL`. On Android 11+ (API 30+) package
 * visibility makes `canOpenURL` return false for any scheme not declared in the manifest
 * `<queries>` block — and we only declare `https`, so `tel:`/`mailto:` were silently reported
 * as unsupported and tap-to-call / tap-to-email did nothing. `Linking.openURL` itself rejects
 * when there is genuinely no handler, so we attempt the open and treat a rejection as
 * "unsupported". This works for `tel:`/`mailto:` on both platforms without manifest surgery.
 */
import { Linking } from 'react-native';

export async function openLink(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
