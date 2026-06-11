/**
 * Tests for the settings store — the persisted theme preference (spec §3.5). Defaults to
 * 'system'; setThemePreference updates + persists; hydrate restores a valid persisted value and
 * ignores garbage. AsyncStorage is the official in-memory mock (see jest.setup.js).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../settingsStore';

const STORAGE_KEY = 'tq.themePreference';
const AUTO_REFRESH_KEY = 'tq.autoRefreshMinutes';

beforeEach(async () => {
  await AsyncStorage.clear();
  useSettingsStore.setState({ themePreference: 'system', autoRefreshMinutes: null });
});

describe('settingsStore', () => {
  it('defaults to the system theme preference', () => {
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });

  it('setThemePreference updates in-memory state immediately', () => {
    useSettingsStore.getState().setThemePreference('dark');
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('setThemePreference persists the value to AsyncStorage', async () => {
    useSettingsStore.getState().setThemePreference('light');
    // Flush the fire-and-forget persistence microtask.
    await Promise.resolve();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('hydrate restores a persisted valid preference', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('hydrate ignores an invalid persisted value and keeps the default', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'sepia');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });

  it('hydrate is a no-op when nothing is persisted', async () => {
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });
});

describe('settingsStore — auto refresh (issue #13)', () => {
  it('defaults to off (null)', () => {
    expect(useSettingsStore.getState().autoRefreshMinutes).toBeNull();
  });

  it('setAutoRefreshMinutes updates in-memory state and persists', async () => {
    useSettingsStore.getState().setAutoRefreshMinutes(5);
    expect(useSettingsStore.getState().autoRefreshMinutes).toBe(5);
    await Promise.resolve();
    expect(await AsyncStorage.getItem(AUTO_REFRESH_KEY)).toBe('5');
  });

  it('setAutoRefreshMinutes(null) turns polling off and clears the persisted value', async () => {
    useSettingsStore.getState().setAutoRefreshMinutes(10);
    await Promise.resolve();
    useSettingsStore.getState().setAutoRefreshMinutes(null);
    expect(useSettingsStore.getState().autoRefreshMinutes).toBeNull();
    await Promise.resolve();
    expect(await AsyncStorage.getItem(AUTO_REFRESH_KEY)).toBeNull();
  });

  it('hydrate restores a persisted valid interval', async () => {
    await AsyncStorage.setItem(AUTO_REFRESH_KEY, '30');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().autoRefreshMinutes).toBe(30);
  });

  it('hydrate ignores an invalid persisted interval and stays off', async () => {
    await AsyncStorage.setItem(AUTO_REFRESH_KEY, '7');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().autoRefreshMinutes).toBeNull();
  });
});
