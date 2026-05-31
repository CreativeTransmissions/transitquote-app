/**
 * Pure URL builders for native deep-links (no I/O — opening is the caller's job via Linking).
 *
 * Used by Job Detail (spec §6.5): tap-to-call, tap-to-email, and "Open in Maps" navigation.
 * All builders return null when there's nothing useful to link to, so the UI can hide the
 * affordance rather than open a broken link.
 */
import type { Stop } from '../types/api';

/** `tel:` URL for a phone number, or null if blank. Strips spaces/dashes the dialer dislikes. */
export function telUrl(phone?: string | null): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\s()-]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

/** `mailto:` URL for an email, or null if blank. */
export function mailtoUrl(email?: string | null): string | null {
  const trimmed = email?.trim();
  return trimmed ? `mailto:${trimmed}` : null;
}

/** A stop's coordinates as `"lat,lng"`, or null when either is missing/non-numeric. */
function stopCoords(stop: Pick<Stop, 'lat' | 'lng'>): string | null {
  const lat = stop.lat?.trim();
  const lng = stop.lng?.trim();
  if (!lat || !lng) return null;
  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return `${lat},${lng}`;
}

/**
 * A cross-platform Google Maps directions URL for the ordered stops, or null if no stop has
 * usable coordinates. The last stop is the destination; any earlier stops become waypoints.
 * Universal `https://www.google.com/maps/dir/` links open the native maps app on both platforms.
 */
export function mapsDirectionsUrl(stops: readonly Pick<Stop, 'lat' | 'lng'>[]): string | null {
  const coords = stops.map(stopCoords).filter((c): c is string => c !== null);
  if (coords.length === 0) return null;

  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(0, -1);
  const params = new URLSearchParams({ api: '1', destination });
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
