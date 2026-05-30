/**
 * Connectivity + last-sync state (Zustand). Updated by `useConnectivity` (expo-network) and the
 * sync hooks. The UI reads `isOnline`/`lastSyncedAt` to drive the offline banner and sync status.
 */
import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  lastSyncedAt: string | null;
  setOnline: (isOnline: boolean) => void;
  setLastSyncedAt: (iso: string) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  lastSyncedAt: null,
  setOnline: (isOnline) => set({ isOnline }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
