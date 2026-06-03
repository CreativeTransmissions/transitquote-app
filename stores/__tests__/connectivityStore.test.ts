/**
 * Tests for the connectivity store — the source of truth for the offline banner and sync-status
 * indicator (spec §11.9). Defaults to online with no sync history; each setter updates only its
 * own slice.
 */
import { useConnectivityStore } from '../connectivityStore';

const initial = useConnectivityStore.getState();

beforeEach(() => {
  // Reset to the store's initial values between tests (state is module-global).
  useConnectivityStore.setState({ isOnline: true, lastSyncedAt: null, isSyncing: false, detailHydration: null });
});

describe('connectivityStore', () => {
  it('defaults to online, never synced, not syncing, no detail hydration', () => {
    expect(initial.isOnline).toBe(true);
    expect(initial.lastSyncedAt).toBeNull();
    expect(initial.isSyncing).toBe(false);
    expect(initial.detailHydration).toBeNull();
  });

  it('setOnline toggles connectivity', () => {
    useConnectivityStore.getState().setOnline(false);
    expect(useConnectivityStore.getState().isOnline).toBe(false);
    useConnectivityStore.getState().setOnline(true);
    expect(useConnectivityStore.getState().isOnline).toBe(true);
  });

  it('setLastSyncedAt records the timestamp without touching other slices', () => {
    useConnectivityStore.getState().setLastSyncedAt('2026-06-03T10:00:00.000Z');
    const state = useConnectivityStore.getState();
    expect(state.lastSyncedAt).toBe('2026-06-03T10:00:00.000Z');
    expect(state.isOnline).toBe(true);
    expect(state.isSyncing).toBe(false);
  });

  it('setSyncing toggles the in-flight flag', () => {
    useConnectivityStore.getState().setSyncing(true);
    expect(useConnectivityStore.getState().isSyncing).toBe(true);
    useConnectivityStore.getState().setSyncing(false);
    expect(useConnectivityStore.getState().isSyncing).toBe(false);
  });

  it('setDetailHydration records progress and clears back to null', () => {
    useConnectivityStore.getState().setDetailHydration({ done: 3, total: 10 });
    expect(useConnectivityStore.getState().detailHydration).toEqual({ done: 3, total: 10 });
    useConnectivityStore.getState().setDetailHydration(null);
    expect(useConnectivityStore.getState().detailHydration).toBeNull();
  });
});
