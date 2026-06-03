/**
 * Tests for useConnectivity — seeds online/offline from expo-network on mount, subscribes to
 * network-state changes, mirrors both into the connectivity store, and unsubscribes on unmount.
 */
const mockSetOnline = jest.fn();
let mockIsOnline = true;
const mockRemove = jest.fn();
let capturedListener: ((s: { isConnected: boolean }) => void) | undefined;

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn((cb: (s: { isConnected: boolean }) => void) => {
    capturedListener = cb;
    return { remove: mockRemove };
  }),
}));
jest.mock('../../stores/connectivityStore', () => ({
  useConnectivityStore: (sel: (s: unknown) => unknown) =>
    sel({ isOnline: mockIsOnline, setOnline: mockSetOnline }),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { getNetworkStateAsync } from 'expo-network';
import { useConnectivity } from '../useConnectivity';

const mockGetState = getNetworkStateAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsOnline = true;
  capturedListener = undefined;
  mockGetState.mockResolvedValue({ isConnected: true });
});

describe('useConnectivity', () => {
  it('returns the store online flag', () => {
    mockIsOnline = false;
    const { result } = renderHook(() => useConnectivity());
    expect(result.current).toBe(false);
  });

  it('seeds connectivity from the initial network state', async () => {
    mockGetState.mockResolvedValue({ isConnected: false });
    renderHook(() => useConnectivity());
    await waitFor(() => expect(mockSetOnline).toHaveBeenCalledWith(false));
  });

  it('mirrors later network-state changes into the store', async () => {
    renderHook(() => useConnectivity());
    await waitFor(() => expect(capturedListener).toBeDefined());

    act(() => capturedListener!({ isConnected: false }));
    expect(mockSetOnline).toHaveBeenCalledWith(false);

    act(() => capturedListener!({ isConnected: true }));
    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('removes the subscription on unmount', () => {
    const { unmount } = renderHook(() => useConnectivity());
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
