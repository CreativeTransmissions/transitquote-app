/**
 * Tests for the customer detail screen: the dispatcher route guard (no redirect while role loads),
 * not-found, header render with job history, and job navigation. Hooks + children are mocked.
 */
let mockRole: Record<string, unknown>;
let mockCustomers: Record<string, unknown>[];
let mockJobs: { id: number; jobRef: string }[];
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    router: { back: jest.fn(), push: (...a: unknown[]) => mockPush(...a) },
    useLocalSearchParams: () => ({ id: '3' }),
  };
});
jest.mock('../../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../../hooks/useCustomers', () => ({
  useCustomers: () => ({ customers: mockCustomers }),
  useCustomerJobs: () => mockJobs,
}));
jest.mock('../../../../hooks/useOutbox', () => ({ useOutbox: () => ({ stateByJob: new Map() }) }));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDate: () => '', formatDateTime: () => '', formatDateTimeSmart: () => '' }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomerDetailScreen from '../[id]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CustomerDetailScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = { role: 'dispatch', isDispatcher: true };
  mockCustomers = [{ id: 3, firstName: 'Ada', lastName: 'Lovelace', phone: '0700', email: 'ada@example.com' }];
  mockJobs = [{ id: 11, jobRef: 'JOB-11' }];
});

describe('CustomerDetailScreen', () => {
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

  it('renders the customer header and job-history count', () => {
    renderScreen();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Job history (1)')).toBeTruthy();
  });

  it('shows a not-found state for an unknown customer', () => {
    mockCustomers = [];
    renderScreen();
    expect(screen.getByText('Customer not found')).toBeTruthy();
  });

  it('navigates to a job from the history', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('job-card-11'));
    expect(mockPush).toHaveBeenCalledWith('/jobs/11');
  });
});
