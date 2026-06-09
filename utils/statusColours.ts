/**
 * Semantic status colour resolver.
 *
 * Maps a job status name to the appropriate semantic colour token via case-insensitive
 * substring matching. Falls back to a deterministic colour derived from the numeric
 * statusTypeId when no keyword matches (cycle over the 5 semantic tokens mod 5).
 * When neither name nor id is available returns statusNeutral.
 *
 * Theme-aware: callers pass the active palette (from useTheme().colours) so the resolved
 * colour matches the current scheme. `palette` defaults to LIGHT_COLOURS so non-UI tests and
 * legacy callers stay simple.
 */
import { LIGHT_COLOURS, type Palette } from '../constants';

/**
 * Resolve a display colour for a job status.
 *
 * @param statusName - Human-readable status label from the API (may be null/undefined).
 * @param statusTypeId - Numeric string id from the API (may be null/undefined). Used only
 *   when the name produces no keyword match, to ensure the same unknown status always gets
 *   the same colour across renders.
 * @param palette - Active colour palette (defaults to the light palette).
 */
export function resolveStatusColour(
  statusName: string | null | undefined,
  statusTypeId?: string | null,
  palette: Palette = LIGHT_COLOURS,
): string {
  const name = (statusName ?? '').toLowerCase();

  // Ordered fallback tokens cycled by (statusTypeId mod 5) when no keyword matches.
  const fallbackCycle = [
    palette.statusNeutral,
    palette.statusInfo,
    palette.statusActive,
    palette.statusDone,
    palette.statusProblem,
  ] as const;

  if (name.includes('pending') || name.includes('new') || name.includes('open')) {
    return palette.statusNeutral;
  }

  if (name.includes('assigned') || name.includes('accepted') || name.includes('claimed')) {
    return palette.statusInfo;
  }

  if (
    name.includes('transit') ||
    name.includes('route') ||
    name.includes('progress') ||
    name.includes('collected') ||
    name.includes('picked')
  ) {
    return palette.statusActive;
  }

  if (name.includes('delivered') || name.includes('completed') || name.includes('done')) {
    return palette.statusDone;
  }

  if (name.includes('cancelled') || name.includes('failed') || name.includes('rejected')) {
    return palette.statusProblem;
  }

  // No keyword match — fall back deterministically by numeric id.
  const id = parseInt(statusTypeId ?? '', 10);
  if (!isNaN(id)) {
    return fallbackCycle[Math.abs(id) % fallbackCycle.length];
  }

  return palette.statusNeutral;
}
