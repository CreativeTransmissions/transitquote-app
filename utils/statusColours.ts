/**
 * Semantic status colour resolver.
 *
 * Maps a job status name to the appropriate semantic colour token via case-insensitive
 * substring matching. Falls back to a deterministic colour derived from the numeric
 * statusTypeId when no keyword matches (cycle over the 5 semantic tokens mod 5).
 * When neither name nor id is available returns statusNeutral.
 */
import { COLOURS } from '../constants';

/** Ordered fallback tokens cycled by (statusTypeId mod 5) when no keyword matches. */
const FALLBACK_CYCLE = [
  COLOURS.statusNeutral,
  COLOURS.statusInfo,
  COLOURS.statusActive,
  COLOURS.statusDone,
  COLOURS.statusProblem,
] as const;

/**
 * Resolve a display colour for a job status.
 *
 * @param statusName - Human-readable status label from the API (may be null/undefined).
 * @param statusTypeId - Numeric string id from the API (may be null/undefined). Used only
 *   when the name produces no keyword match, to ensure the same unknown status always gets
 *   the same colour across renders.
 */
export function resolveStatusColour(
  statusName: string | null | undefined,
  statusTypeId?: string | null,
): string {
  const name = (statusName ?? '').toLowerCase();

  if (
    name.includes('pending') ||
    name.includes('new') ||
    name.includes('open')
  ) return COLOURS.statusNeutral;

  if (
    name.includes('assigned') ||
    name.includes('accepted') ||
    name.includes('claimed')
  ) return COLOURS.statusInfo;

  if (
    name.includes('transit') ||
    name.includes('route') ||
    name.includes('progress') ||
    name.includes('collected') ||
    name.includes('picked')
  ) return COLOURS.statusActive;

  if (
    name.includes('delivered') ||
    name.includes('completed') ||
    name.includes('done')
  ) return COLOURS.statusDone;

  if (
    name.includes('cancelled') ||
    name.includes('failed') ||
    name.includes('rejected')
  ) return COLOURS.statusProblem;

  // No keyword match — fall back deterministically by numeric id.
  const id = parseInt(statusTypeId ?? '', 10);
  if (!isNaN(id)) {
    return FALLBACK_CYCLE[Math.abs(id) % FALLBACK_CYCLE.length];
  }

  return COLOURS.statusNeutral;
}
