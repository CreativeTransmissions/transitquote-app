import { unwrapData } from '../unwrapResponse';

describe('unwrapData', () => {
  it('returns the data when success is true and data is present', () => {
    expect(unwrapData({ success: true, data: { x: 1 } }, 'thing')).toEqual({ x: 1 });
  });

  it('returns an array payload when expectArray is set', () => {
    expect(unwrapData({ success: true, data: [{ id: '1' }] }, 'things', true)).toEqual([{ id: '1' }]);
  });

  it('throws when success is false', () => {
    expect(() => unwrapData({ success: false, data: { x: 1 } }, 'thing')).toThrow('Failed to load thing');
  });

  it('throws when the body is undefined', () => {
    expect(() => unwrapData(undefined, 'thing')).toThrow('Failed to load thing');
  });

  it('throws when success is true but data is null/undefined (thin/recovered envelope)', () => {
    expect(() => unwrapData({ success: true, data: null as never }, 'config')).toThrow('Failed to load config');
    expect(() => unwrapData({ success: true, data: undefined as never }, 'config')).toThrow(
      'Failed to load config',
    );
  });

  it('throws when a list is expected but data is not an array', () => {
    expect(() => unwrapData({ success: true, data: { not: 'array' } as never }, 'jobs', true)).toThrow(
      'Failed to load jobs',
    );
  });
});
