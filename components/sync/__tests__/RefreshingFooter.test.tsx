/**
 * Tests for RefreshingFooter (#12) — the non-blocking strip below a list while a sync runs.
 * Hidden when idle; visible with the "Refreshing…" label while isSyncing. The connectivity
 * store is mocked (selector form).
 */
import { render, screen } from '@testing-library/react-native';
import { RefreshingFooter } from '../RefreshingFooter';

let mockState: { isSyncing: boolean };

jest.mock('../../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) => sel(mockState),
}));

beforeEach(() => {
  mockState = { isSyncing: false };
});

describe('RefreshingFooter', () => {
  it('renders nothing while no sync is in flight', () => {
    render(<RefreshingFooter />);
    expect(screen.queryByTestId('refreshing-footer')).toBeNull();
  });

  it('shows the refreshing strip while syncing', () => {
    mockState = { isSyncing: true };
    render(<RefreshingFooter />);
    expect(screen.getByTestId('refreshing-footer')).toBeTruthy();
    expect(screen.getByText('Refreshing…')).toBeTruthy();
  });
});
