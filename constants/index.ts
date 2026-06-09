export {
  COLOURS,
  LIGHT_COLOURS,
  DARK_COLOURS,
  GRADIENTS,
  LIGHT_GRADIENTS,
  DARK_GRADIENTS,
  STATUS_FALLBACK_COLOURS,
} from './colours';
export type { Palette, GradientSet } from './colours';
export { SPACING, RADIUS } from './spacing';
export { TYPOGRAPHY } from './typography';
export { SHADOWS, LIGHT_SHADOWS, DARK_SHADOWS } from './shadows';
export type { ShadowSet } from './shadows';
export { CARD, CARD_PRESSED, makeCard, makeCardPressed } from './cards';

// Retry cap for outbox flush before an item is surfaced for manual intervention (spec §11.5).
export const MAX_RETRY_ATTEMPTS = 5;

// Bulk detail hydration (offline-first): how many GET /jobs?id= requests run concurrently. The API
// has no rate limiting (CLAUDE.md), but we cap to bound memory and stay polite to the WP backend.
export const DETAIL_HYDRATION_CONCURRENCY = 5;

// Optional ceiling on jobs hydrated per sync for pathological tenants (thousands of jobs). 0 = no
// cap (the default). When applied, the overflow is logged — never silently truncated.
export const MAX_DETAIL_HYDRATION = 0;

// First-sync staging: hydrate at most this many jobs in the first pass so the UI is usable quickly
// (assigned-first ordering means the most valuable jobs load first). Remaining stale/missing details
// continue in subsequent batches within the same sync run. See database/sync/syncEngine.ts §P-2.
export const DETAIL_HYDRATION_FIRST_BATCH = 150;
