/**
 * Tests for OfflineBanner — hidden when online; when offline shows "last updated X ago" if there's
 * a last-sync time, else a generic saved-data message. The connectivity store is mocked (selector
 * form); the relative-time formatter is real. A11y-4: announceForAccessibility is called on mount
 * while offline.
 */
import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { OfflineBanner } from '../OfflineBanner';

let mockState: { isOnline: boolean; lastSyncedAt: string | null };

jest.mock('../../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) => sel(mockState),
}));

beforeEach(() => {
  mockState = { isOnline: true, lastSyncedAt: null };
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('OfflineBanner', () => {
  it('renders nothing while online', () => {
    mockState = { isOnline: true, lastSyncedAt: '2026-06-03T10:00:00.000Z' };
    render(<OfflineBanner />);
    expect(screen.queryByText(/Offline/)).toBeNull();
  });

  it('shows a generic message when offline with no sync history', () => {
    mockState = { isOnline: false, lastSyncedAt: null };
    render(<OfflineBanner />);
    expect(screen.getByText('Offline — showing saved data')).toBeTruthy();
  });

  it('shows the relative last-updated time when offline', () => {
    // A few minutes ago → relativeFromNow yields a "… ago" string embedded in the message.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockState = { isOnline: false, lastSyncedAt: fiveMinAgo };
    render(<OfflineBanner />);
    expect(screen.getByText(/Offline — showing data from .*ago/)).toBeTruthy();
  });

  it('has accessibilityRole="alert" and accessibilityLiveRegion="polite" when offline', () => {
    mockState = { isOnline: false, lastSyncedAt: null };
    const { UNSAFE_getByProps } = render(<OfflineBanner />);
    const banner = UNSAFE_getByProps({ accessibilityRole: 'alert' });
    expect(banner).toBeTruthy();
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  // A11y-4: screen-reader announcement
  it('announces "offline" to the screen reader when it appears (A11y-4)', () => {
    mockState = { isOnline: false, lastSyncedAt: null };
    render(<OfflineBanner />);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "You're offline — showing saved data",
    );
  });

  it('does not announce when online (banner is not shown)', () => {
    mockState = { isOnline: true, lastSyncedAt: null };
    render(<OfflineBanner />);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });
});
