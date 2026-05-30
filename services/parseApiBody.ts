/**
 * Parse a raw API response body, tolerating leading non-JSON noise.
 *
 * The TransitQuote backend currently prepends a PHP `Deprecated` warning (raw HTML) before the
 * JSON on /configuration and /jobs (docs/API_NOTES.md §5). This strips everything before the
 * first `{`/`[`, then JSON-parses. Kept dependency-free so it is unit-testable in isolation.
 *
 * TEMPORARY: the server team is fixing the warning; once shipped this is a no-op and may be removed.
 */
export function parseApiBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw; // already parsed (or non-string)
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const start = trimmed.search(/[{[]/);
  if (start === -1) return trimmed; // no JSON found — hand back the raw text
  return JSON.parse(trimmed.slice(start));
}
