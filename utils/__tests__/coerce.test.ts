import { toInt, toFloat, toBool, toDateOrNull, toStr } from '../coerce';

describe('coerce', () => {
  describe('toInt', () => {
    it('parses wire integer strings', () => {
      expect(toInt('432')).toBe(432);
      expect(toInt('0')).toBe(0);
    });
    it('returns null for null/empty/non-numeric', () => {
      expect(toInt(null)).toBeNull();
      expect(toInt('')).toBeNull();
      expect(toInt(undefined)).toBeNull();
      expect(toInt('abc')).toBeNull();
    });
    it('passes through numbers', () => {
      expect(toInt(284)).toBe(284);
    });
  });

  describe('toFloat', () => {
    it('parses wire decimals', () => {
      expect(toFloat('42.00')).toBe(42);
      expect(toFloat('1.1168')).toBeCloseTo(1.1168);
    });
    it('returns null for empty/null', () => {
      expect(toFloat('')).toBeNull();
      expect(toFloat(null)).toBeNull();
    });
  });

  describe('toBool', () => {
    it('treats only "1" as true', () => {
      expect(toBool('1')).toBe(true);
      expect(toBool('0')).toBe(false);
      expect(toBool('')).toBe(false);
      expect(toBool(null)).toBe(false);
    });
  });

  describe('toDateOrNull', () => {
    it('passes through real datetimes', () => {
      expect(toDateOrNull('2026-05-12 19:29:05')).toBe('2026-05-12 19:29:05');
    });
    it('nulls the zero-date sentinel and empties', () => {
      expect(toDateOrNull('0000-00-00 00:00:00')).toBeNull();
      expect(toDateOrNull('')).toBeNull();
      expect(toDateOrNull(null)).toBeNull();
    });
  });

  describe('toStr', () => {
    it('defaults null/undefined to empty string', () => {
      expect(toStr(null)).toBe('');
      expect(toStr(undefined)).toBe('');
      expect(toStr('x')).toBe('x');
    });
  });
});
