// Shared surface for list-row cards (Job / Customer / Driver) so they stay visually
// identical. A card lifts off the screen wash; a thin green left accent ties it to the
// brand without the heavy 4px bar the first theming pass used.
//
// Theme-aware: `makeCard(theme)` / `makeCardPressed(theme)` return the colour-bearing
// surface for the active scheme. The static CARD / CARD_PRESSED exports remain as light
// aliases for legacy/non-themed paths.
import { COLOURS } from './colours';
import { RADIUS, SPACING } from './spacing';
import { SHADOWS } from './shadows';
import type { Palette } from './colours';
import type { ShadowSet } from './shadows';

interface CardTheme {
  colours: Palette;
  shadows: ShadowSet;
}

export const makeCard = (t: CardTheme) =>
  ({
    backgroundColor: t.colours.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: t.colours.border,
    borderLeftWidth: 3,
    borderLeftColor: t.colours.primaryLight, // subtle accent (lighter + thinner than primary)
    padding: SPACING.md,
    gap: SPACING.xs,
    ...t.shadows.sm,
  }) as const;

export const makeCardPressed = (t: CardTheme) =>
  ({
    backgroundColor: t.colours.surfaceAlt,
  }) as const;

export const CARD = {
  backgroundColor: COLOURS.background,
  borderRadius: RADIUS.md,
  borderWidth: 1,
  borderColor: COLOURS.border,
  borderLeftWidth: 3,
  borderLeftColor: COLOURS.primaryLight,
  padding: SPACING.md,
  gap: SPACING.xs,
  ...SHADOWS.sm,
} as const;

export const CARD_PRESSED = {
  backgroundColor: COLOURS.surfaceAlt,
} as const;
