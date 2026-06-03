/**
 * Tests for the onboarding screen — collects site URL + credentials, submits via useOnboarding,
 * routes to /login on success, and surfaces validation/save errors.
 */
const mockReplace = jest.fn();
let mockOnboarding: { mutate: jest.Mock; isError: boolean; error: Error | null; isPending: boolean };

jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('../../../hooks/useOnboarding', () => ({ useOnboarding: () => mockOnboarding }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingScreen from '../onboarding';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OnboardingScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockReplace.mockReset();
  mockOnboarding = { mutate: jest.fn(), isError: false, error: null, isPending: false };
});

describe('OnboardingScreen', () => {
  it('submits the entered site config and routes to /login on success', () => {
    mockOnboarding.mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    renderScreen();

    fireEvent.changeText(screen.getByTestId('onboarding-site-url'), 'https://acme.example');
    fireEvent.changeText(screen.getByTestId('onboarding-client-id'), 'cid');
    fireEvent.changeText(screen.getByTestId('onboarding-client-secret'), 'secret');
    fireEvent.press(screen.getByTestId('onboarding-submit'));

    expect(mockOnboarding.mutate).toHaveBeenCalledWith(
      { siteUrl: 'https://acme.example', clientId: 'cid', clientSecret: 'secret' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('surfaces a validation/save error', () => {
    mockOnboarding = { mutate: jest.fn(), isError: true, error: new Error('Enter your site URL.'), isPending: false };
    renderScreen();
    expect(screen.getByText('Enter your site URL.')).toBeTruthy();
  });
});
