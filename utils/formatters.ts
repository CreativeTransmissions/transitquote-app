import dayjs from 'dayjs';

// ISO 8601 only — never `new Date(string)` (CLAUDE.md). Returns '' for null/invalid input.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD MMM YYYY') : '';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD MMM YYYY, HH:mm') : '';
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
