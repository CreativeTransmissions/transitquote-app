/**
 * useTheme — THE theming contract for the whole app (the public API later UI waves build on).
 *
 * Resolves the active palette/gradients/shadows from the user's theme preference
 * (stores/settingsStore) against the OS colour scheme:
 *   - preference 'system' → useColorScheme() (null → 'light')
 *   - preference 'light' | 'dark' → that scheme explicitly
 *
 * Components read colour-bearing values from here and apply them via a style array (or a
 * memoized makeStyles factory) — never from literal hex. The returned object is memoized so
 * consumers can depend on it stably (e.g. `useMemo(() => makeStyles(t), [t])`).
 */
import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import {
  LIGHT_COLOURS,
  DARK_COLOURS,
  LIGHT_GRADIENTS,
  DARK_GRADIENTS,
  LIGHT_SHADOWS,
  DARK_SHADOWS,
  type Palette,
  type GradientSet,
  type ShadowSet,
} from '../constants';
import { useSettingsStore } from '../stores/settingsStore';

export type ColourScheme = 'light' | 'dark';

export interface Theme {
  colours: Palette;
  gradients: GradientSet;
  shadows: ShadowSet;
  /** The resolved concrete scheme (after applying preference + OS scheme). */
  scheme: ColourScheme;
}

export function useTheme(): Theme {
  const preference = useSettingsStore((s) => s.themePreference);
  const systemScheme = useColorScheme();

  const scheme: ColourScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return useMemo<Theme>(
    () =>
      scheme === 'dark'
        ? {
            colours: DARK_COLOURS,
            gradients: DARK_GRADIENTS,
            shadows: DARK_SHADOWS,
            scheme: 'dark',
          }
        : {
            colours: LIGHT_COLOURS,
            gradients: LIGHT_GRADIENTS,
            shadows: LIGHT_SHADOWS,
            scheme: 'light',
          },
    [scheme],
  );
}
