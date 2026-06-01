// Shared surface for list-row cards (Job / Customer / Driver) so they stay visually
// identical. A white card lifts off the light-green screen wash; a thin green left
// accent ties it to the brand without the heavy 4px bar the first theming pass used.
import { COLOURS } from './colours';
import { RADIUS, SPACING } from './spacing';
import { SHADOWS } from './shadows';

export const CARD = {
  backgroundColor: COLOURS.background,
  borderRadius: RADIUS.md,
  borderWidth: 1,
  borderColor: COLOURS.border,
  borderLeftWidth: 3,
  borderLeftColor: COLOURS.primaryLight, // subtle accent (lighter + thinner than primary)
  padding: SPACING.md,
  gap: SPACING.xs,
  ...SHADOWS.sm,
} as const;

export const CARD_PRESSED = {
  backgroundColor: COLOURS.surfaceAlt,
} as const;
