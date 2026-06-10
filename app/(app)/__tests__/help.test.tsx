/**
 * Tests for the Help & About screen (H-5): sections render, version + site shown, back navigates.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HelpScreen from '../home/help';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({ router: { back: (...a: unknown[]) => mockBack(...a) } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel: (s: { siteUrl: string | null }) => unknown) =>
    sel({ siteUrl: 'https://test.example.com' }),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <HelpScreen />
    </SafeAreaProvider>,
  );
}

describe('HelpScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the screen title', () => {
    renderScreen();
    expect(screen.getByText('How this app works')).toBeTruthy();
  });

  it('renders all four help sections', () => {
    renderScreen();
    expect(screen.getByText('Your data lives on your phone')).toBeTruthy();
    expect(screen.getByText('Syncing happens in the background')).toBeTruthy();
    expect(screen.getByText('Pending and failed updates')).toBeTruthy();
    expect(screen.getByText('Who sees what')).toBeTruthy();
  });

  it('shows the app version', () => {
    renderScreen();
    expect(screen.getByTestId('help-version')).toBeTruthy();
    expect(screen.getByText('1.2.3')).toBeTruthy();
  });

  it('shows the active site URL', () => {
    renderScreen();
    expect(screen.getByTestId('help-site')).toBeTruthy();
    expect(screen.getByText('https://test.example.com')).toBeTruthy();
  });

  it('shows the admin contact note', () => {
    renderScreen();
    expect(screen.getByText(/Contact your site administrator/)).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('help-back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
