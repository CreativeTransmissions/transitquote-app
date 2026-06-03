/**
 * Tests for the jobs list screen: role-driven header links (dispatcher sees Drivers/Customers),
 * the decentralized-driver Available/My Jobs tabs (which drive the query scope), the filter badge,
 * the DB-error and first-sync states, and job navigation. Hooks + heavy children are mocked; the
 * filter utils are real.
 */
let mockRole: Record<string, unknown>;
let mockJobsResult: Record<string, unknown>;
const mockUseJobs = jest.fn();
const mockPush = jest.fn();

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
  useJobFilters: () => ({ filters: { statusIds: [], driverId: null, dateFrom: null, dateTo: null }, setFilters: jest.fn(), clear: jest.fn() }),
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
    JobList: ({ jobs, onSelect, emptyTitle }: { jobs: { id: number }[]; onSelect: (id: number) => void; emptyTitle: string }) =>
      jobs.length === 0
        ? React.createElement(Text, null, emptyTitle)
        : React.createElement(
            React.Fragment,
            null,
            jobs.map((j) => React.createElement(Pressable, { key: j.id, testID: `row-${j.id}`, onPress: () => onSelect(j.id) }, React.createElement(Text, null, `J${j.id}`))),
          ),
  };
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import JobsScreen from '../index';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function role(overrides: Record<string, unknown> = {}) {
  return { isDispatcher: false, isDriver: false, isDecentralized: false, driverId: null, ...overrides };
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
  mockRole = role();
  mockJobsResult = jobsResult();
  mockUseJobs.mockImplementation(() => mockJobsResult);
});

describe('JobsScreen', () => {
  it('shows Drivers + Customers links for a dispatcher', () => {
    mockRole = role({ isDispatcher: true });
    renderScreen();
    expect(screen.getByText('Drivers')).toBeTruthy();
    expect(screen.getByText('Customers')).toBeTruthy();
  });

  it('hides the dispatcher links for a driver', () => {
    mockRole = role({ isDriver: true });
    renderScreen();
    expect(screen.queryByText('Drivers')).toBeNull();
    expect(screen.queryByText('Customers')).toBeNull();
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

  it('navigates to drivers/customers/profile from the header', () => {
    mockRole = role({ isDispatcher: true });
    renderScreen();
    fireEvent.press(screen.getByText('Drivers'));
    fireEvent.press(screen.getByText('Customers'));
    fireEvent.press(screen.getByText('Profile'));
    expect(mockPush).toHaveBeenCalledWith('/drivers');
    expect(mockPush).toHaveBeenCalledWith('/customers');
    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
