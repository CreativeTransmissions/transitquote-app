/**
 * Tests for the driver detail screen: the dispatcher route guard (no redirect while role loads),
 * not-found, header render (availability + can-assign-to target + assigned jobs), and navigation.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DriverDetailScreen from '../[id]';

let mockRole: Record<string, unknown>;
let mockDrivers: Record<string, unknown>[];
let mockJobs: { id: number; jobRef: string }[];
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    router: { back: jest.fn(), push: (...a: unknown[]) => mockPush(...a) },
    useLocalSearchParams: () => ({ id: '7' }),
  };
});
jest.mock('../../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../../hooks/useDrivers', () => ({ useDrivers: () => mockDrivers }));
jest.mock('../../../../hooks/useJobs', () => ({ useJobs: () => ({ jobs: mockJobs }) }));
jest.mock('../../../../hooks/useOutbox', () => ({ useOutbox: () => ({ stateByJob: new Map() }) }));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDate: () => '', formatDateTime: () => '', formatDateTimeSmart: () => '' }),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DriverDetailScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = { role: 'dispatch', isDispatcher: true };
  mockDrivers = [{ id: 7, firstName: 'Pat', lastName: 'Driver', phone: '0700', email: 'pat@example.com', available: true, canAssignTo: 9 }, { id: 9, firstName: 'Sam', lastName: 'Target' }];
  mockJobs = [{ id: 21, jobRef: 'JOB-21' }];
});

describe('DriverDetailScreen', () => {
  it('does not redirect while the role is still loading', () => {
    mockRole = { role: null, isDispatcher: false };
    renderScreen();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('redirects a loaded non-dispatcher to /jobs', () => {
    mockRole = { role: 'driver', isDispatcher: false };
    renderScreen();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/jobs');
  });

  it('renders the driver header, availability and can-assign-to target', () => {
    renderScreen();
    expect(screen.getByText('Pat Driver')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Sam Target')).toBeTruthy(); // can_assign_to resolved to a name
    expect(screen.getByText('Assigned jobs (1)')).toBeTruthy();
  });

  it('shows a not-found state for an unknown driver', () => {
    mockDrivers = [];
    renderScreen();
    expect(screen.getByText('Driver not found')).toBeTruthy();
  });

  it('navigates to an assigned job', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('job-card-21'));
    expect(mockPush).toHaveBeenCalledWith('/jobs/21');
  });
});
