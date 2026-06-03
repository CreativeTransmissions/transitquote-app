/**
 * Tests for the protected (app) layout — bounces to /login unless authenticated, otherwise renders
 * the Stack. Connectivity tracking is a side effect (mocked to a no-op).
 */
let mockStatus: string;

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, { testID: 'redirect' }, href),
    Stack: () => React.createElement(Text, { testID: 'stack' }, 'STACK'),
  };
});
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ status: mockStatus }),
}));
jest.mock('../../../hooks/useConnectivity', () => ({ useConnectivity: jest.fn() }));

import { render, screen } from '@testing-library/react-native';
import { useConnectivity } from '../../../hooks/useConnectivity';
import AppLayout from '../_layout';

describe('AppLayout auth guard', () => {
  it('redirects to /login when not authenticated', () => {
    mockStatus = 'unauthenticated';
    render(<AppLayout />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  it('renders the Stack when authenticated', () => {
    mockStatus = 'authenticated';
    render(<AppLayout />);
    expect(screen.getByTestId('stack')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('keeps connectivity tracking mounted', () => {
    mockStatus = 'authenticated';
    render(<AppLayout />);
    expect(useConnectivity).toHaveBeenCalled();
  });
});
