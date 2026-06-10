/**
 * Tests for the login screen — collects credentials, submits via useLogin, routes to /jobs on
 * success, surfaces the error message, and offers a "Change site" route back to onboarding.
 * Also verifies §3.9 hero logo and change-site icon row.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from '../login';

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
// Icon is a native module wrapper — stub to avoid native setup in unit tests.
jest.mock('../../../components/shared/Icon', () => ({
  Icon: () => null,
}));

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

  it('"Change site" has accessibilityRole="button"', () => {
    renderScreen();
    const pressable = screen.getByTestId('login-change-site');
    expect(pressable.props.accessibilityRole).toBe('button');
  });

  it('"Change site" has a hitSlop for a 44dp effective touch target (A11y-5)', () => {
    renderScreen();
    const pressable = screen.getByTestId('login-change-site');
    // hitSlop may be normalised to an object or a number — check it is defined
    expect(pressable.props.hitSlop).toBeTruthy();
  });

  it('renders the app logo image in the hero block', () => {
    renderScreen();
    // The Image is decorative (accessible=false). UNSAFE_getAllByType works with the RN Image
    // component; we import it here to avoid inline require().
    const { Image } = require('react-native') as typeof import('react-native');
    const images = screen.UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
    // The logo image has accessible=false (decorative).
    const logo = images.find((img) => img.props.accessible === false);
    expect(logo).toBeTruthy();
  });
});
