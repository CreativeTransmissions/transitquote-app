/**
 * User app settings (Zustand) — theme preference and auto-refresh interval. Session-state
 * pattern like connectivityStore. Preferences are persisted via AsyncStorage (NOT secure-store —
 * they are not sensitive, same store as useJobFilters/useFirstRunHint) and hydrated during app boot.
 *
 * Resolution from preference → concrete scheme lives in hooks/useTheme.ts ('system' follows
 * the OS colour scheme). The auto-refresh interval drives hooks/useAutoRefresh.ts (issue #13).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Allowed polling intervals in minutes (issue #13: 1 min to 1 hour). */
export const AUTO_REFRESH_OPTIONS = [1, 5, 10, 15, 30, 60] as const;
export type AutoRefreshMinutes = (typeof AUTO_REFRESH_OPTIONS)[number];

const THEME_KEY = 'tq.themePreference';
const AUTO_REFRESH_KEY = 'tq.autoRefreshMinutes';

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

const isAutoRefreshMinutes = (value: unknown): value is AutoRefreshMinutes =>
  (AUTO_REFRESH_OPTIONS as readonly number[]).includes(value as number);

interface SettingsState {
  themePreference: ThemePreference;
  /** Auto-refresh polling interval in minutes; null = off (the default). */
  autoRefreshMinutes: AutoRefreshMinutes | null;
  /** Read the persisted preferences (best-effort) and apply them. Safe to call once at boot. */
  hydrate: () => Promise<void>;
  /** Update the preference and persist it (best-effort). */
  setThemePreference: (preference: ThemePreference) => void;
  /** Update the auto-refresh interval (null = off) and persist it (best-effort). */
  setAutoRefreshMinutes: (minutes: AutoRefreshMinutes | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  autoRefreshMinutes: null,
  hydrate: async () => {
    try {
      const rawTheme = await AsyncStorage.getItem(THEME_KEY);
      if (isThemePreference(rawTheme)) set({ themePreference: rawTheme });
      const rawInterval = await AsyncStorage.getItem(AUTO_REFRESH_KEY);
      const parsed = rawInterval == null ? null : Number(rawInterval);
      if (isAutoRefreshMinutes(parsed)) set({ autoRefreshMinutes: parsed });
    } catch {
      /* best-effort hydration — fall back to the defaults */
    }
  },
  setThemePreference: (themePreference) => {
    set({ themePreference });
    AsyncStorage.setItem(THEME_KEY, themePreference).catch(() => {
      /* best-effort persistence; in-memory state is already updated */
    });
  },
  setAutoRefreshMinutes: (autoRefreshMinutes) => {
    set({ autoRefreshMinutes });
    const write =
      autoRefreshMinutes == null
        ? AsyncStorage.removeItem(AUTO_REFRESH_KEY)
        : AsyncStorage.setItem(AUTO_REFRESH_KEY, String(autoRefreshMinutes));
    write.catch(() => {
      /* best-effort persistence; in-memory state is already updated */
    });
  },
}));
