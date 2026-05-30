/**
 * Resolve a display colour for a job status name. Site-specific status colours aren't provided by
 * the API, so this maps common status semantics to the palette (heuristic, name-based). Falls back
 * to a neutral colour for unknown statuses.
 */
import { COLOURS } from '../constants';

export function resolveStatusColour(statusName: string | null | undefined): string {
  const name = (statusName ?? '').toLowerCase();
  if (name.includes('deliver') || name.includes('complete') || name.includes('done')) return COLOURS.success;
  if (name.includes('transit') || name.includes('progress') || name.includes('route') || name.includes('collect')) return COLOURS.warning;
  if (name.includes('cancel') || name.includes('fail') || name.includes('reject')) return COLOURS.danger;
  if (name.includes('assign')) return COLOURS.primary;
  return COLOURS.offline;
}
