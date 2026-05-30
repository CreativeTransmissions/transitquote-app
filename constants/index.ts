export { COLOURS, STATUS_FALLBACK_COLOURS } from './colours';
export { SPACING, RADIUS } from './spacing';
export { TYPOGRAPHY } from './typography';

// Retry cap for outbox flush before an item is surfaced for manual intervention (spec §11.5).
export const MAX_RETRY_ATTEMPTS = 5;
