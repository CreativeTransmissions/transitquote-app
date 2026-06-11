/**
 * Tests for the reset-password screen (issue #14) — pre-fills the username passed from Sign in,
 * submits via useResetPassword, surfaces API errors, shows the server's confirmation message on
 * success, and routes back to Sign in.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ResetPasswordScreen from '../reset-password';

const mockBack = jest.fn();
let mockParams: { username?: string };
let mockReset: {
  mutate: jest.Mock;
  isError: boolean;
  error: Error | null;
  isPending: boolean;
  isSuccess: boolean;
  data: string | undefined;
};

jest.mock('expo-router', () => ({
  router: { back: (...a: unknown[]) => mockBack(...a) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../../../hooks/useResetPassword', () => ({ useResetPassword: () => mockReset }));
jest.mock('../../../components/shared/Icon', () => ({ Icon: () => null }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ResetPasswordScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockBack.mockReset();
  mockParams = {};
  mockReset = { mutate: jest.fn(), isError: false, error: null, isPending: false, isSuccess: false, data: undefined };
});

describe('ResetPasswordScreen', () => {
  it('pre-fills the username passed from the Sign in screen', () => {
    mockParams = { username: 'api-driver' };
    renderScreen();
    expect(screen.getByTestId('reset-username').props.value).toBe('api-driver');
  });

  it('submits the typed username', () => {
    renderScreen();
    fireEvent.changeText(screen.getByTestId('reset-username'), 'driver@example.com');
    fireEvent.press(screen.getByTestId('reset-submit'));
    expect(mockReset.mutate).toHaveBeenCalledWith({ username: 'driver@example.com' });
  });

  it('does not submit while the username is empty', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('reset-submit'));
    expect(mockReset.mutate).not.toHaveBeenCalled();
  });

  it('surfaces the API error message (e.g. "Not authorized")', () => {
    mockReset = { ...mockReset, isError: true, error: new Error('Not authorized') };
    renderScreen();
    expect(screen.getByText('Not authorized')).toBeTruthy();
  });

  it('shows the server confirmation and check-email guidance on success', () => {
    const message = 'If an account exists for that username or email, a password reset email has been sent.';
    mockReset = { ...mockReset, isSuccess: true, data: message };
    renderScreen();
    expect(screen.getByTestId('reset-success-message').props.children).toBe(message);
    // The form is replaced by the success state.
    expect(screen.queryByTestId('reset-submit')).toBeNull();
  });

  it('returns to Sign in from the success state', () => {
    mockReset = { ...mockReset, isSuccess: true, data: 'sent' };
    renderScreen();
    fireEvent.press(screen.getByTestId('reset-back-to-login'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('returns to Sign in from the cancel link', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('reset-cancel'));
    expect(mockBack).toHaveBeenCalled();
  });
});
