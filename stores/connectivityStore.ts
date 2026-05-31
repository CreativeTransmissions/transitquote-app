/**
 * Connectivity + last-sync state (Zustand). Updated by `useConnectivity` (expo-network) and the
 * sync hooks. The UI reads `isOnline`/`lastSyncedAt`/`isSyncing` to drive the offline banner and
 * the sync-status indicator (spec §11.9).
 */
import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  lastSyncedAt: string | null;
  /** True while a foreground sync is in flight — drives the toolbar spinner. */
  isSyncing: boolean;
  setOnline: (isOnline: boolean) => void;
  setLastSyncedAt: (iso: string) => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  lastSyncedAt: null,
  isSyncing: false,
  setOnline: (isOnline) => set({ isOnline }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setSyncing: (isSyncing) => set({ isSyncing }),
}));
