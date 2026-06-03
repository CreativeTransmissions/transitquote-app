/**
 * Tests for notification setup (spec §10 Option B): one-time configuration (foreground handler +
 * Android channel, idempotent) and the permission resolution (granted / permanently-denied /
 * request), tracked as the three states not-asked | denied | granted. expo-notifications is mocked
 * and Platform.OS is controllable; module state is reset between tests via resetModules.
 */
let mockOS = 'android';

jest.mock('react-native', () => ({ Platform: { get OS() { return mockOS; } } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

// Re-require a fresh module (and its mocks) per test so the internal configured/permission state
// never leaks between cases.
function load() {
  let mod!: typeof import('../setup');
  let notifications!: typeof import('expo-notifications');
  jest.isolateModules(() => {
    mod = require('../setup');
    notifications = require('expo-notifications');
  });
  return { mod, notifications };
}

beforeEach(() => {
  mockOS = 'android';
  jest.clearAllMocks();
});

describe('configureNotifications', () => {
  it('installs the foreground handler and the Android channel', async () => {
    const { mod, notifications } = load();
    await mod.configureNotifications();
    expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith('job-updates', expect.any(Object));
  });

  it('skips the Android channel on iOS', async () => {
    mockOS = 'ios';
    const { mod, notifications } = load();
    await mod.configureNotifications();
    expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('is idempotent (second call is a no-op)', async () => {
    const { mod, notifications } = load();
    await mod.configureNotifications();
    await mod.configureNotifications();
    expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

describe('ensureNotificationPermission', () => {
  it('resolves to granted when already granted (no prompt)', async () => {
    const { mod, notifications } = load();
    (notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });

    expect(await mod.ensureNotificationPermission()).toBe('granted');
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mod.getNotificationPermission()).toBe('granted');
  });

  it('resolves to denied without prompting when permission is permanently denied', async () => {
    const { mod, notifications } = load();
    (notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });

    expect(await mod.ensureNotificationPermission()).toBe('denied');
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when askable and reflects the result', async () => {
    const { mod, notifications } = load();
    (notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
    (notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    expect(await mod.ensureNotificationPermission()).toBe('granted');
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('resolves to denied when the request is refused', async () => {
    const { mod, notifications } = load();
    (notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
    (notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    expect(await mod.ensureNotificationPermission()).toBe('denied');
  });

  it('defaults to not-asked before any resolution', () => {
    const { mod } = load();
    expect(mod.getNotificationPermission()).toBe('not-asked');
  });
});
