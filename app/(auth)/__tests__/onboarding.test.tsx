/**
 * Tests for the onboarding screen — collects site URL + credentials, submits via useOnboarding,
 * routes to /login on success, surfaces validation/save errors, and renders the §3.9 "What
 * you'll need" card, H-4 field helpers, and the "What's this?" credential expander.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingScreen from '../onboarding';

const mockReplace = jest.fn();
let mockOnboarding: { mutate: jest.Mock; isError: boolean; error: Error | null; isPending: boolean };

jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('../../../hooks/useOnboarding', () => ({ useOnboarding: () => mockOnboarding }));

// Icon is a native module wrapper — stub to avoid native setup in unit tests.
jest.mock('../../../components/shared/Icon', () => ({
  Icon: () => null,
}));

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

describe('OnboardingScreen — H-4 field helpers', () => {
  it('shows the site URL helper text', () => {
    renderScreen();
    expect(
      screen.getByText('Your full WordPress site address, e.g. https://courier.example.com'),
    ).toBeTruthy();
  });

  it('shows the credential helper text under the Client Secret field', () => {
    renderScreen();
    expect(
      screen.getByText(
        'Your administrator can find these under TransitTeam → API in WordPress.',
      ),
    ).toBeTruthy();
  });

  it('renders the "What\'s this?" expander button', () => {
    renderScreen();
    expect(screen.getByTestId('onboarding-cred-expander')).toBeTruthy();
  });

  it('expander button has accessibilityRole="button" and starts collapsed', () => {
    renderScreen();
    const expander = screen.getByTestId('onboarding-cred-expander');
    expect(expander.props.accessibilityRole).toBe('button');
    expect(expander.props.accessibilityState?.expanded).toBe(false);
  });

  it('toggles the expander open and sets accessibilityState expanded=true', () => {
    renderScreen();
    const expander = screen.getByTestId('onboarding-cred-expander');
    // Content not visible before tap.
    expect(screen.queryByTestId('onboarding-cred-expander-content')).toBeNull();
    fireEvent.press(expander);
    // Content visible after tap.
    expect(screen.getByTestId('onboarding-cred-expander-content')).toBeTruthy();
    expect(expander.props.accessibilityState?.expanded).toBe(true);
  });

  it('collapses the expander when pressed a second time', () => {
    renderScreen();
    const expander = screen.getByTestId('onboarding-cred-expander');
    fireEvent.press(expander);
    expect(screen.getByTestId('onboarding-cred-expander-content')).toBeTruthy();
    fireEvent.press(expander);
    expect(screen.queryByTestId('onboarding-cred-expander-content')).toBeNull();
    expect(expander.props.accessibilityState?.expanded).toBe(false);
  });

  it('shows the explanatory paragraph when expanded', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-cred-expander'));
    // Match on a phrase that avoids apostrophe encoding concerns.
    expect(
      screen.getByText(/TransitTeam connects this app to your company/),
    ).toBeTruthy();
  });
});

describe('OnboardingScreen — §3.9 "What you\'ll need" card', () => {
  it('renders the card', () => {
    renderScreen();
    expect(screen.getByTestId('onboarding-needs-card')).toBeTruthy();
  });

  it('shows the site address bullet', () => {
    renderScreen();
    expect(screen.getByText('Your TransitTeam site address')).toBeTruthy();
  });

  it('shows the Client ID / Secret bullet', () => {
    renderScreen();
    expect(screen.getByText('A Client ID and Secret from your administrator')).toBeTruthy();
  });

  it('shows the WordPress username bullet', () => {
    renderScreen();
    expect(screen.getByText('Your WordPress username and password')).toBeTruthy();
  });
});
