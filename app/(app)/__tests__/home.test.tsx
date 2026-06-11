/**
 * Tests for the Profile screen: user/role/assignment rows, the driver section, the multi-site
 * switcher (only when >1 site), and the confirm-then-act logout / switch flows (via Alert). The
 * data hooks, router, and Alert are mocked.
 */
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../home/index';
import { useSettingsStore } from '../../../stores/settingsStore';

let mockUser: Record<string, unknown> | null;
let mockRole: Record<string, unknown>;
let mockDrivers: Record<string, unknown>[];
let mockSites: { sites: Record<string, unknown>[]; activeSiteId: string | null; switchTo: jest.Mock };
const mockLogoutMutate = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('../../../hooks/useCurrentUser', () => ({ useCurrentUser: () => mockUser }));
jest.mock('../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../hooks/useDrivers', () => ({ useDrivers: () => mockDrivers }));
jest.mock('../../../hooks/useLogout', () => ({ useLogout: () => ({ mutate: mockLogoutMutate, isPending: false }) }));
jest.mock('../../../hooks/useSites', () => ({ useSites: () => mockSites }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ProfileScreen />
    </SafeAreaProvider>,
  );
}

// Invoke the button at `index` from the most recent Alert.alert call.
function pressAlertButton(index: number) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as { onPress?: () => void }[];
  return buttons[index].onPress?.();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUser = { firstName: 'Ada', lastName: 'Lovelace' };
  mockRole = { role: 'dispatch', assignmentMode: 'Centralized', driverId: null };
  mockDrivers = [];
  mockSites = { sites: [{ id: 'site-1', siteUrl: 'https://a.example' }], activeSiteId: 'site-1', switchTo: jest.fn().mockResolvedValue(undefined) };
  useSettingsStore.setState({ themePreference: 'system', autoRefreshMinutes: null });
});

describe('ProfileScreen', () => {
  it('renders the user name, role and assignment mode', () => {
    renderScreen();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('dispatch')).toBeTruthy();
    expect(screen.getByText('Centralized')).toBeTruthy();
  });

  it('renders the active site URL', () => {
    renderScreen();
    expect(screen.getByText('https://a.example')).toBeTruthy();
  });

  it('shows the driver section when the user is a driver', () => {
    mockRole = { role: 'driver', assignmentMode: 'Decentralized', driverId: 7 };
    mockDrivers = [{ id: 7, phone: '0700', email: 'pat@example.com', available: true }];
    renderScreen();
    expect(screen.getByText('0700')).toBeTruthy();
    expect(screen.getByText('pat@example.com')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('hides the switcher with a single site and shows it with more than one', () => {
    renderScreen();
    expect(screen.queryByTestId('site-site-2')).toBeNull();

    mockSites = {
      sites: [
        { id: 'site-1', siteUrl: 'https://a.example' },
        { id: 'site-2', siteUrl: 'https://b.example' },
      ],
      activeSiteId: 'site-1',
      switchTo: jest.fn().mockResolvedValue(undefined),
    };
    renderScreen();
    expect(screen.getByTestId('site-site-2')).toBeTruthy();
  });

  it('confirms logout then clears the session and routes to /login', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('profile-logout'));
    expect(Alert.alert).toHaveBeenCalledWith('Log out', expect.any(String), expect.any(Array));

    mockLogoutMutate.mockImplementation((_v, opts) => opts?.onSuccess?.());
    pressAlertButton(1); // "Log out"
    expect(mockLogoutMutate).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders the Appearance theme options and reflects the current preference', () => {
    renderScreen();
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('theme-system')).toBeTruthy();
    expect(screen.getByTestId('theme-light')).toBeTruthy();
    expect(screen.getByTestId('theme-dark')).toBeTruthy();
    // Default 'system' row is checked.
    expect(screen.getByTestId('theme-system').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('theme-dark').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('selecting a theme option updates the settings store immediately', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('theme-dark'));
    expect(useSettingsStore.getState().themePreference).toBe('dark');

    fireEvent.press(screen.getByTestId('theme-light'));
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });

  it('renders the Auto refresh options with Off checked by default (#13)', () => {
    renderScreen();
    expect(screen.getByText('Auto refresh')).toBeTruthy();
    for (const id of ['auto-refresh-off', 'auto-refresh-1', 'auto-refresh-5', 'auto-refresh-10', 'auto-refresh-15', 'auto-refresh-30', 'auto-refresh-60']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(screen.getByTestId('auto-refresh-off').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('auto-refresh-5').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('selecting an auto-refresh interval updates the settings store, and Off clears it', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('auto-refresh-5'));
    expect(useSettingsStore.getState().autoRefreshMinutes).toBe(5);

    fireEvent.press(screen.getByTestId('auto-refresh-off'));
    expect(useSettingsStore.getState().autoRefreshMinutes).toBeNull();
  });

  it('confirms a site switch then switches and resets to the entry route', async () => {
    const switchTo = jest.fn().mockResolvedValue(undefined);
    mockSites = {
      sites: [
        { id: 'site-1', siteUrl: 'https://a.example' },
        { id: 'site-2', siteUrl: 'https://b.example' },
      ],
      activeSiteId: 'site-1',
      switchTo,
    };
    renderScreen();

    fireEvent.press(screen.getByTestId('site-site-2'));
    expect(Alert.alert).toHaveBeenCalledWith('Switch site', expect.any(String), expect.any(Array));

    await pressAlertButton(1); // "Switch"
    expect(switchTo).toHaveBeenCalledWith('site-2');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('ProfileScreen — Help section', () => {
  it('renders the Help section with the help-link row', () => {
    renderScreen();
    expect(screen.getByText('Help')).toBeTruthy();
    expect(screen.getByTestId('help-link')).toBeTruthy();
    expect(screen.getByText('How this app works')).toBeTruthy();
  });

  it('navigates to /home/help when the help row is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('help-link'));
    expect(mockPush).toHaveBeenCalledWith('/home/help');
  });
});
