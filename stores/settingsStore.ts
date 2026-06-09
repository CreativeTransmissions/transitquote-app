/**
 * User app settings (Zustand) — currently the theme preference. Session-state pattern like
 * connectivityStore. The preference is persisted via AsyncStorage (NOT secure-store — it is
 * not sensitive, same store as useJobFilters/useFirstRunHint) and hydrated during app boot.
 *
 * Resolution from preference → concrete scheme lives in hooks/useTheme.ts ('system' follows
 * the OS colour scheme).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'tq.themePreference';

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  /** Read the persisted preference (best-effort) and apply it. Safe to call once at boot. */
  hydrate: () => Promise<void>;
  /** Update the preference and persist it (best-effort). */
  setThemePreference: (preference: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (isThemePreference(raw)) set({ themePreference: raw });
    } catch {
      /* best-effort hydration — fall back to the 'system' default */
    }
  },
  setThemePreference: (themePreference) => {
    set({ themePreference });
    AsyncStorage.setItem(STORAGE_KEY, themePreference).catch(() => {
      /* best-effort persistence; in-memory state is already updated */
    });
  },
}));
