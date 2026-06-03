import { Linking } from 'react-native';
import { openLink } from '../openLink';

describe('openLink', () => {
  let openURL: jest.SpyInstance;
  let canOpenURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false and does nothing for a null/empty url', async () => {
    expect(await openLink(null)).toBe(false);
    expect(await openLink('')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('opens tel:/mailto: WITHOUT calling canOpenURL (Android 11+ package-visibility safe)', async () => {
    expect(await openLink('tel:+441234567890')).toBe(true);
    expect(await openLink('mailto:driver@example.com')).toBe(true);

    expect(openURL).toHaveBeenCalledWith('tel:+441234567890');
    expect(openURL).toHaveBeenCalledWith('mailto:driver@example.com');
    // The whole point of the fix: never gate on canOpenURL, which lies under package visibility.
    expect(canOpenURL).not.toHaveBeenCalled();
  });

  it('opens an https maps url', async () => {
    expect(await openLink('https://www.google.com/maps/dir/?api=1&destination=1,2')).toBe(true);
  });

  it('returns false when the OS genuinely has no handler (openURL rejects)', async () => {
    openURL.mockRejectedValue(new Error('No Activity found to handle Intent'));
    expect(await openLink('tel:123')).toBe(false);
  });
});
