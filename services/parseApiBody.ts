/**
 * Parse a raw API response body, tolerating leading non-JSON noise.
 *
 * The TransitQuote backend used to prepend a PHP `Deprecated` warning (raw HTML) before the
 * JSON on /configuration and /jobs (docs/API_NOTES.md §5). This strips everything before the
 * first `{`/`[`, then JSON-parses. Kept dependency-free so it is unit-testable in isolation.
 *
 * The server warnings were fixed 2026-06-01 (verified live: /configuration, /jobs, and the writes
 * all return clean JSON), so this strip is now a no-op. KEPT as a defensive guard against a PHP
 * warning regression on any endpoint — it cost us once. Safe to retire if that risk is accepted.
 */
export function parseApiBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw; // already parsed (or non-string)
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const start = trimmed.search(/[{[]/);
  if (start === -1) return trimmed; // no JSON found — hand back the raw text
  return JSON.parse(trimmed.slice(start));
}
