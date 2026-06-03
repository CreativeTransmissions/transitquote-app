/**
 * Connectivity + last-sync state (Zustand). Updated by `useConnectivity` (expo-network) and the
 * sync hooks. The UI reads `isOnline`/`lastSyncedAt`/`isSyncing` to drive the offline banner and
 * the sync-status indicator (spec §11.9).
 */
import { create } from 'zustand';

/** Determinate progress for the bulk detail-hydration phase (spec §11.9); null when not running. */
export interface DetailHydrationProgress {
  done: number;
  total: number;
}

interface ConnectivityState {
  isOnline: boolean;
  lastSyncedAt: string | null;
  /** True while a foreground sync is in flight — drives the toolbar spinner. */
  isSyncing: boolean;
  /** Live progress of the detail-hydration phase ("Downloading job details… 42/120"); null when idle. */
  detailHydration: DetailHydrationProgress | null;
  setOnline: (isOnline: boolean) => void;
  setLastSyncedAt: (iso: string) => void;
  setSyncing: (isSyncing: boolean) => void;
  setDetailHydration: (progress: DetailHydrationProgress | null) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  lastSyncedAt: null,
  isSyncing: false,
  detailHydration: null,
  setOnline: (isOnline) => set({ isOnline }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setDetailHydration: (detailHydration) => set({ detailHydration }),
}));
