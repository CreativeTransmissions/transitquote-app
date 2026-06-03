/**
 * Tests for the login screen — collects credentials, submits via useLogin, routes to /jobs on
 * success, surfaces the error message, and offers a "Change site" route back to onboarding.
 */
const mockReplace = jest.fn();
let mockLogin: { mutate: jest.Mock; isError: boolean; error: Error | null; isPending: boolean };

jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});
jest.mock('../../../hooks/useLogin', () => ({ useLogin: () => mockLogin }));
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ siteUrl: 'https://acme.example' }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from '../login';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LoginScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockReplace.mockReset();
  mockLogin = { mutate: jest.fn(), isError: false, error: null, isPending: false };
});

describe('LoginScreen', () => {
  it('submits the typed credentials and routes to /jobs on success', () => {
    // mutate(vars, opts) — invoke the success callback to verify navigation.
    mockLogin.mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-username'), 'api-driver');
    fireEvent.changeText(screen.getByTestId('login-password'), 'driver123');
    fireEvent.press(screen.getByTestId('login-submit'));

    expect(mockLogin.mutate).toHaveBeenCalledWith(
      { username: 'api-driver', password: 'driver123' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/jobs');
  });

  it('shows the error message when login fails', () => {
    mockLogin = { mutate: jest.fn(), isError: true, error: new Error('Invalid credentials'), isPending: false };
    renderScreen();
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('routes to onboarding from "Change site"', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Change site'));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });
});
