import { act, render, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
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
let mockCustomersResult: Record<string, unknown>;
jest.mock('../../../../hooks/useCustomers', () => ({
  useCustomers: () => mockCustomersResult,
}));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));
// Sentinel for the non-blocking refresh strip (#21) — its own behaviour is unit-tested.
jest.mock('../../../../components/sync/RefreshingFooter', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    RefreshingFooter: ({ syncing }: { syncing?: boolean }) =>
      React.createElement(Text, { testID: 'refreshing-footer-slot' }, String(syncing)),
  };
});

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

beforeEach(() => {
  mockCustomersResult = { customers: [], dbError: undefined, isSyncing: false, syncError: null, refresh: jest.fn() };
});

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

describe('CustomersScreen — non-blocking pull-to-refresh (#21)', () => {
  beforeEach(() => {
    (useRole as jest.Mock).mockReset();
    (useRole as jest.Mock).mockReturnValue(roleInfo({ role: 'dispatch', isDispatcher: true }));
  });

  it('passes gesture-scoped refreshing to the list — NOT isSyncing', () => {
    mockCustomersResult = { ...mockCustomersResult, isSyncing: true };
    renderScreen();
    const list = screen.UNSAFE_getByType(FlatList);
    // A background sync is in flight, but no pull happened: the blocking spinner stays hidden.
    expect(list.props.refreshing).toBe(false);
  });

  it('pull triggers the customers refresh and dismisses the spinner after the ack window', () => {
    jest.useFakeTimers();
    try {
      const refresh = jest.fn();
      mockCustomersResult = { ...mockCustomersResult, refresh };
      renderScreen();

      act(() => screen.UNSAFE_getByType(FlatList).props.onRefresh());
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(screen.UNSAFE_getByType(FlatList).props.refreshing).toBe(true);

      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(screen.UNSAFE_getByType(FlatList).props.refreshing).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('drives the RefreshingFooter from the customers-scoped sync state', () => {
    mockCustomersResult = { ...mockCustomersResult, isSyncing: true };
    renderScreen();
    expect(screen.getByTestId('refreshing-footer-slot')).toHaveTextContent('true');
  });
});
