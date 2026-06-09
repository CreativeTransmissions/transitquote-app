/**
 * Tests for the jobs list screen: the decentralized-driver Available/My Jobs tabs (which drive the
 * query scope), the filter toolbar, the DB-error and first-sync states, job navigation, the
 * first-run hint card, and the clear-filters empty-state action. Primary section navigation now
 * lives in the bottom tab bar ((app)/_layout.tsx), not header links. Hooks + heavy children are
 * mocked; the filter utils are real.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import JobsScreen from '../index';

let mockRole: Record<string, unknown>;
let mockJobsResult: Record<string, unknown>;
const mockUseJobs = jest.fn();
const mockPush = jest.fn();
const mockDismissHint = jest.fn();
let mockShowHint = false;
// Mutable clear fn so tests can spy on it.
let mockClear = jest.fn();
let mockActiveFilters: { statusIds: number[]; driverId: null; dateFrom: null; dateTo: null } = {
  statusIds: [],
  driverId: null,
  dateFrom: null,
  dateTo: null,
};

jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});
jest.mock('../../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../../hooks/useJobs', () => ({ useJobs: (...args: unknown[]) => mockUseJobs(...args) }));
jest.mock('../../../../hooks/useOutbox', () => ({ useOutbox: () => ({ stateByJob: new Map() }) }));
jest.mock('../../../../hooks/useStatusTypes', () => ({ useStatusTypes: () => [] }));
jest.mock('../../../../hooks/useDrivers', () => ({ useDrivers: () => [] }));
jest.mock('../../../../hooks/useJobFilters', () => ({
  useJobFilters: () => ({ filters: mockActiveFilters, setFilters: jest.fn(), clear: mockClear }),
}));
jest.mock('../../../../hooks/useFirstRunHint', () => ({
  useFirstRunHint: () => ({ showHint: mockShowHint, dismissHint: mockDismissHint }),
}));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../../../components/sync/SyncStatusIndicator', () => ({ SyncStatusIndicator: () => null }));
jest.mock('../../../../components/sync/FirstSyncProgress', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FirstSyncProgress: () => React.createElement(Text, { testID: 'first-sync' }, 'SYNCING') };
});
jest.mock('../../../../components/jobs/JobFilterSheet', () => ({ JobFilterSheet: () => null }));
jest.mock('../../../../components/jobs/JobList', () => {
  const React = require('react');
  const { Text, Pressable } = require('react-native');
  return {
    JobList: ({
      jobs,
      onSelect,
      emptyTitle,
      emptyAction,
    }: {
      jobs: { id: number }[];
      onSelect: (id: number) => void;
      emptyTitle: string;
      emptyAction?: { label: string; onPress: () => void };
    }) =>
      jobs.length === 0
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, null, emptyTitle),
            emptyAction
              ? React.createElement(
                  Pressable,
                  { testID: 'empty-action', onPress: emptyAction.onPress },
                  React.createElement(Text, null, emptyAction.label),
                )
              : null,
          )
        : React.createElement(
            React.Fragment,
            null,
            jobs.map((j) => React.createElement(Pressable, { key: j.id, testID: `row-${j.id}`, onPress: () => onSelect(j.id) }, React.createElement(Text, null, `J${j.id}`))),
          ),
  };
});

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function role(overrides: Record<string, unknown> = {}) {
  return { role: null, isDispatcher: false, isDriver: false, isDecentralized: false, driverId: null, ...overrides };
}

function jobsResult(overrides: Record<string, unknown> = {}) {
  return { jobs: [], dbError: undefined, isSyncing: false, syncError: null, refresh: jest.fn(), cancelSync: jest.fn(), ...overrides };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <JobsScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockShowHint = false;
  mockClear = jest.fn();
  mockActiveFilters = { statusIds: [], driverId: null, dateFrom: null, dateTo: null };
  mockRole = role();
  mockJobsResult = jobsResult();
  mockUseJobs.mockImplementation(() => mockJobsResult);
});

describe('JobsScreen', () => {
  it('renders the Jobs title but no section-nav header links (tabs replace them)', () => {
    mockRole = role({ isDispatcher: true });
    renderScreen();
    expect(screen.getByText('Jobs')).toBeTruthy();
    expect(screen.queryByText('Drivers')).toBeNull();
    expect(screen.queryByText('Customers')).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('shows the filter and refresh toolbar buttons', () => {
    renderScreen();
    expect(screen.getByTestId('jobs-filter')).toBeTruthy();
    expect(screen.getByTestId('jobs-refresh')).toBeTruthy();
  });

  it('shows Available/My Jobs tabs only for a decentralized driver, and switches scope', () => {
    mockRole = role({ isDriver: true, isDecentralized: true, driverId: 7 });
    renderScreen();

    expect(screen.getByTestId('tab-available')).toBeTruthy();
    // Initial scope is the Available tab.
    expect(mockUseJobs).toHaveBeenCalledWith('available', 7);

    fireEvent.press(screen.getByTestId('tab-mine'));
    expect(mockUseJobs).toHaveBeenLastCalledWith('mine', 7);
  });

  it('uses the all scope (no tabs) for a dispatcher', () => {
    mockRole = role({ isDispatcher: true });
    renderScreen();
    expect(screen.queryByTestId('tab-available')).toBeNull();
    expect(mockUseJobs).toHaveBeenCalledWith('all', null);
  });

  it('renders the DB-error empty state', () => {
    mockJobsResult = jobsResult({ dbError: new Error('disk full') });
    renderScreen();
    expect(screen.getByText('Couldn’t load jobs')).toBeTruthy();
    expect(screen.getByText('disk full')).toBeTruthy();
  });

  it('shows the first-sync progress when empty + syncing', () => {
    mockJobsResult = jobsResult({ jobs: [], isSyncing: true });
    renderScreen();
    expect(screen.getByTestId('first-sync')).toBeTruthy();
  });

  it('navigates to a job from the list', () => {
    mockJobsResult = jobsResult({ jobs: [{ id: 42 }] });
    renderScreen();
    fireEvent.press(screen.getByTestId('row-42'));
    expect(mockPush).toHaveBeenCalledWith('/jobs/42');
  });

  // ── HintCard — first-run hint ────────────────────────────────────────────────

  it('does not show the hint when showHint is false', () => {
    mockShowHint = false;
    mockRole = role({ role: 'driver', isDriver: true });
    renderScreen();
    expect(screen.queryByTestId('jobs-hint')).toBeNull();
  });

  it('does not show the hint when role is null (not yet resolved)', () => {
    mockShowHint = true;
    mockRole = role({ role: null });
    renderScreen();
    expect(screen.queryByTestId('jobs-hint')).toBeNull();
  });

  it('shows the decentralized-driver hint copy', () => {
    mockShowHint = true;
    mockRole = role({ role: 'driver', isDriver: true, isDecentralized: true });
    renderScreen();
    expect(screen.getByTestId('jobs-hint')).toBeTruthy();
    expect(
      screen.getByText(
        'Available shows unclaimed jobs anyone can take. My Jobs is your work. Tap a job, then Claim job to take it.',
      ),
    ).toBeTruthy();
  });

  it('shows the centralized-driver hint copy', () => {
    mockShowHint = true;
    mockRole = role({ role: 'driver', isDriver: true, isDecentralized: false });
    renderScreen();
    expect(screen.getByTestId('jobs-hint')).toBeTruthy();
    expect(
      screen.getByText('Jobs your dispatcher assigns to you appear here automatically. Pull down to refresh.'),
    ).toBeTruthy();
  });

  it('shows the dispatcher hint copy', () => {
    mockShowHint = true;
    mockRole = role({ role: 'dispatch', isDispatcher: true });
    renderScreen();
    expect(screen.getByTestId('jobs-hint')).toBeTruthy();
    expect(
      screen.getByText(
        'Tap any job to assign a driver or update its status. Use Filter to narrow by status, driver, or date.',
      ),
    ).toBeTruthy();
  });

  it('calls dismissHint when the dismiss button is pressed', () => {
    mockShowHint = true;
    mockRole = role({ role: 'driver', isDriver: true });
    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss hint' }));
    expect(mockDismissHint).toHaveBeenCalledTimes(1);
  });

  // ── Empty state — clear-filters action ──────────────────────────────────────

  it('shows the "No jobs match your filters" empty title when filters are active', () => {
    mockActiveFilters = { statusIds: [1], driverId: null, dateFrom: null, dateTo: null };
    renderScreen();
    expect(screen.getByText('No jobs match your filters')).toBeTruthy();
  });

  it('renders the "Clear filters" action button in the empty state when filters are active', () => {
    mockActiveFilters = { statusIds: [2], driverId: null, dateFrom: null, dateTo: null };
    renderScreen();
    expect(screen.getByTestId('empty-action')).toBeTruthy();
    expect(screen.getByText('Clear filters')).toBeTruthy();
  });

  it('fires the clear function when "Clear filters" is pressed', () => {
    mockActiveFilters = { statusIds: [2], driverId: null, dateFrom: null, dateTo: null };
    renderScreen();
    fireEvent.press(screen.getByTestId('empty-action'));
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('does not show the "Clear filters" action when no filters are active', () => {
    mockActiveFilters = { statusIds: [], driverId: null, dateFrom: null, dateTo: null };
    renderScreen();
    expect(screen.queryByTestId('empty-action')).toBeNull();
  });
});
