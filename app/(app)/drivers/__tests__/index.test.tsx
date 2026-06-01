import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RoleInfo } from '../../../../hooks/useRole';
import { useRole } from '../../../../hooks/useRole';
import DriversScreen from '../index';

// Regression for the dispatcher route-guard bug (BACKLOG M3): useRole() derives the role from a
// Drizzle useLiveQuery that is EMPTY on first render, so `role` is momentarily null. The old guard
// `if (!isDispatcher) <Redirect/>` fired during that loading window and bounced dispatchers back to
// /jobs — making Drivers/Customers unreachable. The fix only redirects once the role has loaded.

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    // Render the redirect target as text so the test can assert whether (and where) we redirected.
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    router: { back: jest.fn(), push: jest.fn() },
  };
});
jest.mock('../../../../hooks/useRole', () => ({ useRole: jest.fn() }));
jest.mock('../../../../hooks/useDrivers', () => ({ useDrivers: () => [] }));
jest.mock('../../../../hooks/useDriverJobCounts', () => ({ useDriverJobCounts: () => new Map() }));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function roleInfo(overrides: Partial<RoleInfo>): RoleInfo {
  return {
    role: null,
    roles: [],
    assignmentMode: 'Centralized',
    isDriver: false,
    isDispatcher: false,
    isDecentralized: false,
    driverId: null,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DriversScreen />
    </SafeAreaProvider>,
  );
}

describe('DriversScreen — dispatcher route guard (role-loading redirect race)', () => {
  beforeEach(() => (useRole as jest.Mock).mockReset());

  it('does NOT redirect while the role is still loading (role === null)', () => {
    (useRole as jest.Mock).mockReturnValue(roleInfo({ role: null, isDispatcher: false }));
    renderScreen();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText('Drivers')).toBeTruthy();
  });

  it('redirects a loaded non-dispatcher (driver) to /jobs', () => {
    (useRole as jest.Mock).mockReturnValue(roleInfo({ role: 'driver', isDriver: true, isDispatcher: false }));
    renderScreen();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/jobs');
  });

  it('renders for a dispatcher (no redirect)', () => {
    (useRole as jest.Mock).mockReturnValue(roleInfo({ role: 'dispatch', isDispatcher: true }));
    renderScreen();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText('Drivers')).toBeTruthy();
  });
});
