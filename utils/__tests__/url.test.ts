import { normaliseSiteUrl } from '../url';

describe('normaliseSiteUrl', () => {
  it('prepends https:// when no scheme is given', () => {
    expect(normaliseSiteUrl('example.com')).toBe('https://example.com');
  });
  it('preserves an existing scheme', () => {
    expect(normaliseSiteUrl('http://example.com')).toBe('http://example.com');
    expect(normaliseSiteUrl('https://example.com')).toBe('https://example.com');
  });
  it('trims whitespace and strips trailing slashes', () => {
    expect(normaliseSiteUrl('  https://example.com/  ')).toBe('https://example.com');
    expect(normaliseSiteUrl('example.com///')).toBe('https://example.com');
  });
  it('returns empty string for blank input', () => {
    expect(normaliseSiteUrl('')).toBe('');
    expect(normaliseSiteUrl('   ')).toBe('');
  });
});
