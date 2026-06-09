/**
 * Tests for SyncStatusIndicator (spec §11.9): quiet by default; a spinner while syncing; a pending
 * badge with the count; a tappable failed badge that opens the problems sheet. The store + outbox
 * hook are mocked; the problems sheet is stubbed to assert it opens.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

let mockIsSyncing: boolean;
let mockDetailHydration: { done: number; total: number } | null;
let mockOutbox: { pendingCount: number; failed: { id: number }[] };

jest.mock('../../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) =>
    sel({ isSyncing: mockIsSyncing, detailHydration: mockDetailHydration }),
}));
jest.mock('../../../hooks/useOutbox', () => ({ useOutbox: () => mockOutbox }));
jest.mock('../SyncProblemsSheet', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SyncProblemsSheet: ({ visible }: { visible: boolean }) =>
      visible ? React.createElement(Text, null, 'PROBLEMS OPEN') : null,
  };
});

beforeEach(() => {
  mockIsSyncing = false;
  mockDetailHydration = null;
  mockOutbox = { pendingCount: 0, failed: [] };
});

describe('SyncStatusIndicator', () => {
  it('renders nothing when idle, synced and the outbox is empty', () => {
    render(<SyncStatusIndicator />);
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });

  it('shows the indicator while syncing', () => {
    mockIsSyncing = true;
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-status')).toBeTruthy();
  });

  it('shows determinate detail-hydration progress while the detail phase runs', () => {
    mockIsSyncing = true;
    mockDetailHydration = { done: 42, total: 120 };
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-detail-progress')).toBeTruthy();
    expect(screen.getByText('42/120')).toBeTruthy();
  });

  it('hides the detail-progress count once the detail phase finishes', () => {
    mockIsSyncing = true;
    mockDetailHydration = null;
    render(<SyncStatusIndicator />);
    expect(screen.queryByTestId('sync-detail-progress')).toBeNull();
  });

  it('shows a pending badge with the count', () => {
    mockOutbox = { pendingCount: 3, failed: [] };
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-pending-badge')).toBeTruthy();
    expect(screen.getByText('3 pending')).toBeTruthy();
  });

  it('pending badge has the correct accessibilityLabel', () => {
    mockOutbox = { pendingCount: 5, failed: [] };
    render(<SyncStatusIndicator />);
    expect(screen.getByLabelText('5 updates waiting to sync')).toBeTruthy();
  });

  it('shows a failed badge and opens the problems sheet when tapped', () => {
    mockOutbox = { pendingCount: 0, failed: [{ id: 1 }, { id: 2 }] };
    render(<SyncStatusIndicator />);
    expect(screen.getByText('2 failed')).toBeTruthy();

    expect(screen.queryByText('PROBLEMS OPEN')).toBeNull();
    fireEvent.press(screen.getByTestId('sync-failed-badge'));
    expect(screen.getByText('PROBLEMS OPEN')).toBeTruthy();
  });

  it('failed badge has the correct accessibilityLabel', () => {
    mockOutbox = { pendingCount: 0, failed: [{ id: 1 }, { id: 2 }] };
    render(<SyncStatusIndicator />);
    expect(screen.getByLabelText('2 updates failed')).toBeTruthy();
  });

  it('spinner has accessibilityLabel "Syncing" when not in detail phase', () => {
    mockIsSyncing = true;
    mockDetailHydration = null;
    render(<SyncStatusIndicator />);
    expect(screen.getByLabelText('Syncing')).toBeTruthy();
  });

  it('spinner has determinate accessibilityLabel during detail phase', () => {
    mockIsSyncing = true;
    mockDetailHydration = { done: 10, total: 50 };
    render(<SyncStatusIndicator />);
    expect(screen.getByLabelText('Downloading job details, 10 of 50')).toBeTruthy();
  });
});
