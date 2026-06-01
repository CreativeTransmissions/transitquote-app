/**
 * Convert a WordPress/PHP `date()` format string into a dayjs format string, so the app renders
 * dates/times to match the site's WordPress settings (date_format / time_format).
 *
 * Only the common PHP tokens are mapped; unknown letters are escaped as dayjs literals (`[x]`) and
 * non-letters pass through. A leading `\` in PHP escapes the next char to a literal — preserved here.
 * See docs/API_NOTES.md for where the formats come from (configuration field_config).
 */

// PHP date() token → dayjs token.
const TOKENS: Record<string, string> = {
  // Day
  d: 'DD', // 01-31
  j: 'D', // 1-31
  D: 'ddd', // Mon
  l: 'dddd', // Monday
  N: 'E', // ISO day of week 1-7
  w: 'd', // 0-6
  // Month
  F: 'MMMM', // January
  M: 'MMM', // Jan
  m: 'MM', // 01-12
  n: 'M', // 1-12
  // Year
  Y: 'YYYY', // 2026
  y: 'YY', // 26
  // Time
  a: 'a', // am/pm
  A: 'A', // AM/PM
  g: 'h', // 1-12
  G: 'H', // 0-23
  h: 'hh', // 01-12
  H: 'HH', // 00-23
  i: 'mm', // minutes
  s: 'ss', // seconds
  // Ordinal suffix has no standalone dayjs token — drop it (handled by `Do` elsewhere if needed).
  S: '',
};

export function phpToDayjsFormat(php: string | null | undefined): string {
  if (!php) return '';
  let out = '';
  for (let i = 0; i < php.length; i++) {
    const ch = php[i];
    if (ch === '\\') {
      // PHP escape: the next character is a literal.
      const next = php[i + 1];
      if (next) {
        out += `[${next}]`;
        i++;
      }
      continue;
    }
    if (ch in TOKENS) {
      out += TOKENS[ch];
    } else if (/[A-Za-z]/.test(ch)) {
      // Unmapped letter → treat as a literal so dayjs doesn't interpret it as a token.
      out += `[${ch}]`;
    } else {
      out += ch;
    }
  }
  return out;
}
