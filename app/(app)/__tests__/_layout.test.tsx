/**
 * Tests for the protected (app) layout — bounces to /login unless authenticated, otherwise renders
 * the bottom Tabs. Role gates the dispatcher-only tabs (Drivers/Customers) via `href: null` so a
 * driver (or the role-loading window) only sees Jobs + Profile. Connectivity tracking is a side
 * effect (mocked to a no-op). The Tabs/Tabs.Screen are stubbed to capture each screen's options.
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useConnectivity } from '../../../hooks/useConnectivity';
import AppLayout from '../_layout';

let mockStatus: string;
let mockRole: Record<string, unknown>;
let mockOutbox: { failed: unknown[] };

// Capture the options passed to each Tabs.Screen so we can assert href/badge gating.
const screenOptions: Record<string, Record<string, unknown>> = {};
// Capture the top-level Tabs props (screenOptions + screenListeners).
let capturedTabsProps: Record<string, unknown> = {};

jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    Tabs: Object.assign(
      (props: { children: React.ReactNode; screenOptions?: unknown; screenListeners?: unknown }) => {
        capturedTabsProps = { screenOptions: props.screenOptions, screenListeners: props.screenListeners };
        return React.createElement(View, { testID: 'tabs' }, props.children);
      },
      {
        Screen: ({ name, options }: { name: string; options: Record<string, unknown> }) => {
          screenOptions[name] = options;
          // Render the tab title only when it is not hidden (href !== null), mirroring the tab bar.
          return options.href === null
            ? null
            : React.createElement(Text, { testID: `tab-${name}` }, String(options.title));
        },
      },
    ),
  };
});
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ status: mockStatus }),
}));
jest.mock('../../../hooks/useConnectivity', () => ({ useConnectivity: jest.fn() }));
jest.mock('../../../hooks/useAutoRefresh', () => ({ useAutoRefresh: jest.fn() }));
jest.mock('../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../hooks/useOutbox', () => ({ useOutbox: () => mockOutbox }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderLayout() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppLayout />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  for (const k of Object.keys(screenOptions)) delete screenOptions[k];
  capturedTabsProps = {};
  mockStatus = 'authenticated';
  mockRole = { isDispatcher: false };
  mockOutbox = { failed: [] };
});

describe('AppLayout auth guard', () => {
  it('redirects to /login when not authenticated', () => {
    mockStatus = 'unauthenticated';
    renderLayout();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
    expect(screen.queryByTestId('tabs')).toBeNull();
  });

  it('renders the Tabs when authenticated', () => {
    renderLayout();
    expect(screen.getByTestId('tabs')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('keeps connectivity tracking mounted', () => {
    renderLayout();
    expect(useConnectivity).toHaveBeenCalled();
  });
});

describe('AppLayout tab role gating', () => {
  it('shows all four tabs for a dispatcher', () => {
    mockRole = { isDispatcher: true };
    renderLayout();
    expect(screenOptions.jobs.href).toBeUndefined();
    expect(screenOptions.home.href).toBeUndefined();
    expect(screenOptions.drivers.href).toBeUndefined();
    expect(screenOptions.customers.href).toBeUndefined();
    expect(screen.getByTestId('tab-drivers')).toBeTruthy();
    expect(screen.getByTestId('tab-customers')).toBeTruthy();
  });

  it('hides Drivers + Customers tabs for a driver (href: null)', () => {
    mockRole = { isDispatcher: false };
    renderLayout();
    expect(screenOptions.drivers.href).toBeNull();
    expect(screenOptions.customers.href).toBeNull();
    // Jobs + Profile remain visible.
    expect(screenOptions.jobs.href).toBeUndefined();
    expect(screenOptions.home.href).toBeUndefined();
    expect(screen.queryByTestId('tab-drivers')).toBeNull();
    expect(screen.queryByTestId('tab-customers')).toBeNull();
    expect(screen.getByTestId('tab-jobs')).toBeTruthy();
    // The Profile tab maps to the `home` route.
    expect(screen.getByTestId('tab-home')).toBeTruthy();
  });

  it('hides the dispatcher tabs while the role is still loading (isDispatcher false)', () => {
    mockRole = { isDispatcher: false };
    renderLayout();
    expect(screenOptions.drivers.href).toBeNull();
    expect(screenOptions.customers.href).toBeNull();
  });

  it('shows a danger badge on the Jobs tab when there are failed outbox items', () => {
    mockOutbox = { failed: [{ id: 1 }, { id: 2 }] };
    renderLayout();
    expect(screenOptions.jobs.tabBarBadge).toBe(2);
  });

  it('shows no Jobs badge when the outbox has no failures', () => {
    renderLayout();
    expect(screenOptions.jobs.tabBarBadge).toBeUndefined();
  });
});

describe('AppLayout — tab-press haptic (A11y-7)', () => {
  it('registers a tabPress screenListener', () => {
    renderLayout();
    expect(typeof (capturedTabsProps.screenListeners as Record<string, unknown>)?.tabPress).toBe('function');
  });

  it('fires hapticLight when the tabPress listener is invoked', async () => {
    const { hapticLight } = require('../../../utils/haptics') as { hapticLight: jest.Mock };
    hapticLight.mockClear();
    renderLayout();
    const listeners = capturedTabsProps.screenListeners as Record<string, () => void>;
    listeners.tabPress();
    // hapticLight is fire-and-forget (void) — allow the microtask queue to drain.
    await Promise.resolve();
    expect(hapticLight).toHaveBeenCalledTimes(1);
  });
});

describe('AppLayout — tab label font scaling (A11y-3)', () => {
  it('sets tabBarAllowFontScaling: false in screenOptions', () => {
    renderLayout();
    const opts = capturedTabsProps.screenOptions as Record<string, unknown>;
    expect(opts?.tabBarAllowFontScaling).toBe(false);
  });
});
