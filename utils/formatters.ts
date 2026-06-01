import dayjs from 'dayjs';
import { toDateOrNull } from './coerce';

// Defaults used when no WordPress format is supplied (offline before config, tests).
export const DEFAULT_DATE_FORMAT = 'DD MMM YYYY';
export const DEFAULT_DATETIME_FORMAT = 'DD MMM YYYY, HH:mm';

// ISO 8601 only — never `new Date(string)` (CLAUDE.md). Returns '' for null/invalid input.
// `fmt` is a dayjs format string; pass the site's WordPress format via useDateFormat to match it.
export function formatDate(iso: string | null | undefined, fmt: string = DEFAULT_DATE_FORMAT): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format(fmt) : '';
}

export function formatDateTime(iso: string | null | undefined, fmt: string = DEFAULT_DATETIME_FORMAT): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format(fmt) : '';
}

/**
 * Format a datetime, showing the time only when there's a real time-of-day to show. A date with no
 * time is stored as midnight (00:00:00) — that means "no time captured", so render it date-only. If
 * the site's form doesn't collect a time at all (`askForTime` false), always render date-only.
 */
export function smartDateTime(
  iso: string | null | undefined,
  opts: { askForTime?: boolean; dateFmt?: string; dateTimeFmt?: string } = {},
): string {
  // Guard the zero-date sentinel/empty (raw stop dates aren't pre-sanitised) — dayjs would
  // otherwise parse "0000-00-00 00:00:00" into a bogus 1899 date.
  const safe = toDateOrNull(iso);
  if (!safe) return '';
  const d = dayjs(safe);
  if (!d.isValid()) return '';
  const hasTimeOfDay = d.format('HH:mm:ss') !== '00:00:00';
  const showTime = opts.askForTime !== false && hasTimeOfDay;
  return d.format(showTime ? (opts.dateTimeFmt ?? DEFAULT_DATETIME_FORMAT) : (opts.dateFmt ?? DEFAULT_DATE_FORMAT));
}

export function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const mins = dayjs().diff(d, 'minute');
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

// Currency symbol comes from site configuration (CLAUDE.md) — never hardcode '£'/'$'.
export function formatCurrency(amount: number | null | undefined, symbol: string): string {
  if (amount == null || Number.isNaN(amount)) return '';
  return `${symbol}${amount.toFixed(2)}`;
}

export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

/**
 * Surname-first display name, e.g. "Smith, John". Falls back gracefully: surname only,
 * first name only, or '' when neither is present.
 */
export function nameSurnameFirst(first?: string | null, last?: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (l && f) return `${l}, ${f}`;
  return l || f || '';
}
