/**
 * Parse a raw API response body, tolerating non-JSON noise *around* the JSON envelope.
 *
 * The TransitQuote backend has repeatedly leaked PHP output around the JSON envelope
 * (docs/API_NOTES.md §5): a `Deprecated` warning on /configuration and /jobs, and on
 * 2026-06-02 a `$journey_order` deprecation **plus** a `wpdberror` SQL block on `GET /jobs?id=`.
 * Historically the noise has been *leading*, but PHP shutdown handlers run *after* the response
 * body is flushed, so trailing noise is equally plausible — and `JSON.parse` rejects any trailing
 * non-whitespace, so a single `Deprecated` line appended after the envelope would crash every
 * screen. This guard is permanent defence-in-depth: do NOT assume the body is clean JSON.
 *
 * Strategy: find the JSON envelope by scanning for `{`/`[` candidates and extracting the
 * *balanced* span starting at each (string-literal aware, so brackets inside `"…"` don't count).
 * Noise brackets (a stray `[` inside a `wpdberror` block, or a `{` in a PHP notice) fail to parse
 * and are skipped. The real REST envelope is the *trailing* JSON value, so we return the LAST span
 * that parses cleanly — this survives both leading noise (the documented cases) and trailing noise.
 *
 * Kept dependency-free so it is unit-testable in isolation.
 */
export function parseApiBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw; // already parsed (or non-string)
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const firstBracket = trimmed.search(/[{[]/);
  if (firstBracket === -1) return trimmed; // no JSON found — hand back the raw text

  // Fast path: the body is already clean JSON (the normal case). One parse, no scanning.
  if (firstBracket === 0) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Falls through to the scan — likely a clean envelope followed by trailing noise.
    }
  }

  // Scan every `{`/`[` candidate, extract its balanced span, and keep the LAST one that parses.
  // Returning the last (not the first) honours "the envelope is the trailing JSON value" so a
  // noise segment that happens to be valid JSON can't win over the real envelope after it.
  let parsed: unknown;
  let found = false;
  for (let i = firstBracket; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c !== '{' && c !== '[') continue;
    const end = balancedEnd(trimmed, i);
    if (end === -1) continue;
    try {
      parsed = JSON.parse(trimmed.slice(i, end));
      found = true;
      i = end - 1; // skip past this span; the loop's i++ resumes after it
    } catch {
      // this bracket starts inside the noise, not the envelope — keep scanning
    }
  }
  if (found) return parsed;

  // Nothing parsed: surface the failure with the canonical JSON error (rather than the raw noise).
  return JSON.parse(trimmed.slice(firstBracket));
}

/**
 * Index just past the bracket-balanced structure that starts at `start` (a `{` or `[`), or -1 if
 * it never closes. String-literal aware: brackets inside a double-quoted JSON string don't count,
 * and escaped quotes are respected. Only the outer bracket type is depth-counted, which is
 * sufficient to locate the structure's end (nested objects add matched pairs; nested arrays of the
 * other type don't affect the count but their own contents are skipped over by index position).
 */
function balancedEnd(s: string, start: number): number {
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}
