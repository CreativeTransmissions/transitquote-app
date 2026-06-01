import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RoleInfo } from '../../../../hooks/useRole';
import { useRole } from '../../../../hooks/useRole';
import CustomersScreen from '../index';

// Regression for the dispatcher route-guard bug — see drivers/__tests__/index.test.tsx for the
// full explanation. CustomersScreen carried the identical guard and bug.

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    router: { back: jest.fn(), push: jest.fn() },
  };
});
jest.mock('../../../../hooks/useRole', () => ({ useRole: jest.fn() }));
jest.mock('../../../../hooks/useCustomers', () => ({
  useCustomers: () => ({ customers: [], dbError: undefined, isSyncing: false, refresh: jest.fn() }),
}));
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
      <CustomersScreen />
    </SafeAreaProvider>,
  );
}

describe('CustomersScreen — dispatcher route guard (role-loading redirect race)', () => {
  beforeEach(() => (useRole as jest.Mock).mockReset());

  it('does NOT redirect while the role is still loading (role === null)', () => {
    (useRole as jest.Mock).mockReturnValue(roleInfo({ role: null, isDispatcher: false }));
    renderScreen();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText('Customers')).toBeTruthy();
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
    expect(screen.getByText('Customers')).toBeTruthy();
  });
});
