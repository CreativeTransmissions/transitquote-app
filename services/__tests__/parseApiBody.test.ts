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
});
