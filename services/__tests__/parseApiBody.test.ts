import { parseApiBody } from '../parseApiBody';

describe('parseApiBody', () => {
  it('parses clean JSON objects', () => {
    expect(parseApiBody('{"data":{"x":1},"success":true}')).toEqual({
      data: { x: 1 },
      success: true,
    });
  });

  it('strips the leading PHP Deprecated warning before parsing (the live /configuration case)', () => {
    const raw =
      '<br />\n<b>Deprecated</b>:  Creation of dynamic property TQ_API_Public::$team_plugin is deprecated in <b>/var/www/html/.../class-transitquote-api-public.php</b> on line <b>1117</b><br />\n{"data":{"ok":1},"success":true}';
    expect(parseApiBody(raw)).toEqual({ data: { ok: 1 }, success: true });
  });

  it('parses JSON arrays', () => {
    expect(parseApiBody('[{"id":"1"},{"id":"2"}]')).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns null for an empty body', () => {
    expect(parseApiBody('')).toBeNull();
    expect(parseApiBody('   ')).toBeNull();
  });

  it('passes through an already-parsed object (non-string input)', () => {
    const obj = { data: 1, success: true };
    expect(parseApiBody(obj)).toBe(obj);
  });

  it('returns the raw text when no JSON is present', () => {
    expect(parseApiBody('not json at all')).toBe('not json at all');
  });

  // Regression — the 2026-06-02 `GET /jobs?id=` outage (docs/API_NOTES.md §5). A PHP
  // `$journey_order` deprecation AND a `wpdberror` SQL block were prepended to the envelope. The
  // SQL error text contains a stray `[` (`[Unknown column …]`) that sits BEFORE the real
  // `{"data"…}`, so the old "slice at the first bracket" sliced into the SQL error and threw —
  // every job detail rendered empty. The scan must skip the noise bracket and find the envelope.
  it('finds the trailing envelope past a wpdberror SQL block whose text contains a stray "["', () => {
    const raw =
      '<br />\n<b>Deprecated</b>:  Creation of dynamic property TQ_API_Public::$journey_order is deprecated in <b>/var/www/html/.../class-transitquote-api-public.php</b> on line <b>823</b><br />\n' +
      "<br />\n<b>WordPress database error:</b> [Unknown column 'wp_4xj.quote_surcharges.quote_surcharges.id' in 'field list'] for query SELECT quote_surcharges.quote_surcharges.id FROM wp_4xj_tq_quote_surcharges<br />\n" +
      '{"data":{"job":{"id":"7","job_ref":"TQ-7"}},"success":true}';
    expect(parseApiBody(raw)).toEqual({
      data: { job: { id: '7', job_ref: 'TQ-7' } },
      success: true,
    });
  });

  it('finds a trailing ARRAY envelope even when leading noise contains a stray bracket', () => {
    const raw =
      "<br />\n<b>WordPress database error:</b> [Unknown column 'x.id'] for query SELECT x.id<br />\n" +
      '[{"id":"1"},{"id":"2"}]';
    expect(parseApiBody(raw)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('throws on leading noise followed by a genuinely malformed envelope (surfaces the error)', () => {
    expect(() => parseApiBody('<b>Deprecated</b>: noise<br />\n{"data":{,}')).toThrow();
  });

  // PHP shutdown handlers run AFTER the response body is flushed, so noise can trail the envelope.
  // JSON.parse rejects trailing non-whitespace, so a clean envelope + a trailing Deprecated line
  // would otherwise crash every screen.
  it('tolerates trailing PHP noise after a clean object envelope', () => {
    const raw =
      '{"data":{"ok":1},"success":true}\n<br />\n<b>Deprecated</b>: something on shutdown in <b>x.php</b><br />';
    expect(parseApiBody(raw)).toEqual({ data: { ok: 1 }, success: true });
  });

  it('tolerates trailing noise after an array envelope', () => {
    expect(parseApiBody('[{"id":"1"}]\nNotice: undefined index')).toEqual([{ id: '1' }]);
  });

  it('recovers the envelope when noise BOTH leads and trails it', () => {
    const raw =
      "<br />\n<b>WordPress database error:</b> [Unknown column 'x.id'] for query SELECT x.id<br />\n" +
      '{"data":{"job":{"id":"7"}},"success":true}\n<br />\n<b>Deprecated</b>: trailing<br />';
    expect(parseApiBody(raw)).toEqual({ data: { job: { id: '7' } }, success: true });
  });

  it('returns the trailing envelope, not a JSON-looking noise object before it', () => {
    // A noise segment that happens to be valid JSON must not win over the real trailing envelope.
    const raw = 'Notice {"not":"envelope"} junk\n{"data":1,"success":true}';
    expect(parseApiBody(raw)).toEqual({ data: 1, success: true });
  });

  it('does not mis-parse a brace that appears inside a string value', () => {
    const raw = '<b>Deprecated</b><br />\n{"data":{"note":"a } brace in a string"},"success":true}';
    expect(parseApiBody(raw)).toEqual({ data: { note: 'a } brace in a string' }, success: true });
  });
});
