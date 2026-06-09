/**
 * Tests for the useTheme contract (spec §3.5): preference 'system' follows the OS colour scheme
 * (null → light), explicit 'light'/'dark' override the OS, and the returned object is memoized
 * (stable identity while inputs are unchanged).
 */
import { renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { useTheme } from '../useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { LIGHT_COLOURS, DARK_COLOURS } from '../../constants';

// Spy on the real useColorScheme so the rest of react-native stays intact (renderHook needs it).
const mockedColorScheme = jest.spyOn(ReactNative, 'useColorScheme');

beforeEach(() => {
  mockedColorScheme.mockReturnValue('light');
  useSettingsStore.setState({ themePreference: 'system' });
});

afterAll(() => {
  mockedColorScheme.mockRestore();
});

describe('useTheme', () => {
  it('system preference follows the OS light scheme', () => {
    mockedColorScheme.mockReturnValue('light');
    useSettingsStore.setState({ themePreference: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
    expect(result.current.colours).toBe(LIGHT_COLOURS);
  });

  it('system preference follows the OS dark scheme', () => {
    mockedColorScheme.mockReturnValue('dark');
    useSettingsStore.setState({ themePreference: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colours).toBe(DARK_COLOURS);
  });

  it('system preference treats a null OS scheme as light', () => {
    mockedColorScheme.mockReturnValue(null as never);
    useSettingsStore.setState({ themePreference: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
  });

  it('explicit dark preference overrides a light OS scheme', () => {
    mockedColorScheme.mockReturnValue('light');
    useSettingsStore.setState({ themePreference: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colours.background).toBe(DARK_COLOURS.background);
    expect(result.current.gradients.dark[0]).toBe('#101814');
  });

  it('explicit light preference overrides a dark OS scheme', () => {
    mockedColorScheme.mockReturnValue('dark');
    useSettingsStore.setState({ themePreference: 'light' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
    expect(result.current.colours).toBe(LIGHT_COLOURS);
  });

  it('returns a memoized (stable) object across re-renders when inputs are unchanged', () => {
    const { result, rerender } = renderHook(() => useTheme());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });

  it('exposes light/dark shadows for the resolved scheme', () => {
    mockedColorScheme.mockReturnValue('dark');
    useSettingsStore.setState({ themePreference: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.shadows.sm.shadowColor).toBe('#000000');
  });
});
