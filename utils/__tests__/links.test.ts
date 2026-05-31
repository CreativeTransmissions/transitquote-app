import { telUrl, mailtoUrl, mapsDirectionsUrl } from '../links';

describe('telUrl', () => {
  it('builds a tel: URL and strips spaces/punctuation', () => {
    expect(telUrl('07700 900 (123)')).toBe('tel:07700900123');
    expect(telUrl('+44 7700-900123')).toBe('tel:+447700900123');
  });

  it('returns null for blank/missing input', () => {
    expect(telUrl('')).toBeNull();
    expect(telUrl('   ')).toBeNull();
    expect(telUrl(null)).toBeNull();
    expect(telUrl(undefined)).toBeNull();
  });
});

describe('mailtoUrl', () => {
  it('builds a mailto: URL', () => {
    expect(mailtoUrl('a@b.com')).toBe('mailto:a@b.com');
  });

  it('returns null for blank/missing input', () => {
    expect(mailtoUrl('')).toBeNull();
    expect(mailtoUrl(null)).toBeNull();
    expect(mailtoUrl(undefined)).toBeNull();
  });
});

describe('mapsDirectionsUrl', () => {
  it('returns null when no stop has usable coordinates', () => {
    expect(mapsDirectionsUrl([])).toBeNull();
    expect(mapsDirectionsUrl([{ lat: '', lng: '' }])).toBeNull();
    expect(mapsDirectionsUrl([{ lat: 'abc', lng: 'def' }])).toBeNull();
  });

  it('uses the only stop as the destination', () => {
    const url = mapsDirectionsUrl([{ lat: '51.5', lng: '-0.12' }]);
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=51.5%2C-0.12');
  });

  it('treats the last stop as destination and earlier stops as waypoints', () => {
    const url = mapsDirectionsUrl([
      { lat: '51.50', lng: '-0.10' },
      { lat: '51.51', lng: '-0.11' },
      { lat: '51.52', lng: '-0.12' },
    ]);
    expect(url).toContain('destination=51.52%2C-0.12');
    expect(url).toContain('waypoints=51.50%2C-0.10%7C51.51%2C-0.11');
  });

  it('skips stops with missing coordinates', () => {
    const url = mapsDirectionsUrl([
      { lat: '', lng: '' },
      { lat: '51.52', lng: '-0.12' },
    ]);
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=51.52%2C-0.12');
  });
});
