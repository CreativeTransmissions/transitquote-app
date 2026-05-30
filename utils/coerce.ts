/**
 * Wire-value coercion helpers.
 *
 * The TransitQuote API serialises everything as strings (ids, money, booleans) and uses the
 * MySQL zero-date sentinel "0000-00-00 00:00:00" (see docs/API_NOTES.md). These helpers turn
 * raw wire values into typed values at the mapping boundary so nothing downstream sees strings.
 */

const ZERO_DATE = '0000-00-00 00:00:00';

/** Parse a wire integer ("432") to a number, or null for null/empty/non-numeric. */
export function toInt(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/** Parse a wire decimal ("42.00") to a number, or null for null/empty/non-numeric. */
export function toFloat(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

/** WordPress boolean flag: "1" => true, everything else ("0"/""/null) => false. */
export function toBool(value: string | null | undefined): boolean {
  return value === '1';
}

/**
 * Normalise a wire datetime to an ISO-ish string, or null. Treats the zero-date sentinel
 * and empty strings as null so date formatters/dayjs never receive garbage.
 */
export function toDateOrNull(value: string | null | undefined): string | null {
  if (!value || value === ZERO_DATE) return null;
  return value;
}

/** Non-null string, defaulting null/undefined to ''. */
export function toStr(value: string | null | undefined): string {
  return value ?? '';
}
