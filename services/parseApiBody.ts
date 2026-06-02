/**
 * Parse a raw API response body, tolerating leading non-JSON noise.
 *
 * The TransitQuote backend has repeatedly leaked PHP output *before* the JSON envelope
 * (docs/API_NOTES.md §5): first a `Deprecated` warning on /configuration and /jobs, and again on
 * 2026-06-02 a `$journey_order` deprecation **plus** a `wpdberror` SQL block on `GET /jobs?id=`.
 * The real REST envelope is always the TRAILING JSON value, so the robust strategy is to scan each
 * `{`/`[` candidate left→right and return the first slice that JSON-parses to end-of-string.
 *
 * Why not "slice at the first `{`/`[`" (the old approach)? Because noise can itself contain a
 * bracket. The 2026-06-02 SQL error text was `[Unknown column …quote_surcharges.quote_surcharges.id…]`
 * — the stray `[` came *before* the real `{"data"…}`, so the old code sliced into the SQL error,
 * `JSON.parse` threw, and **every job detail rendered empty** with no user-visible error. The scan
 * skips noise brackets (they fail to parse) and lands on the genuine envelope instead.
 *
 * Kept dependency-free so it is unit-testable in isolation. The server has regressed PHP warnings
 * into REST JSON more than once, so this guard stays as defence-in-depth even when the wire is clean.
 */
export function parseApiBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw; // already parsed (or non-string)
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const firstBracket = trimmed.search(/[{[]/);
  if (firstBracket === -1) return trimmed; // no JSON found — hand back the raw text

  // Fast path: the body is already clean JSON (the normal case now). A single parse; let a
  // genuinely malformed envelope throw, matching the original surface-the-error behaviour.
  if (firstBracket === 0) return JSON.parse(trimmed);

  // Leading noise before the JSON (a PHP warning/notice, or a `wpdberror` SQL block whose text
  // contains a stray bracket). Scan each `{`/`[` candidate and return the first slice that parses
  // cleanly to end-of-string — that is the trailing REST envelope. Brackets inside the noise fail
  // JSON.parse (there is non-JSON text between them and the envelope) and are skipped.
  for (let i = firstBracket; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c !== '{' && c !== '[') continue;
    try {
      return JSON.parse(trimmed.slice(i));
    } catch {
      // this bracket starts inside the noise, not the envelope — keep scanning
    }
  }

  // Leading noise but nothing parsed: surface the failure by re-parsing the first bracket, which
  // throws the canonical JSON error (rather than silently returning the noise as a string).
  return JSON.parse(trimmed.slice(firstBracket));
}
