/**
 * Tests for useFirstRunHint:
 * - hidden (showHint false) while the AsyncStorage load is pending
 * - shown when the flag has never been persisted (null)
 * - hidden when already dismissed ('true' persisted)
 * - dismissHint sets showHint false and persists the flag
 * - flags are keyed per site — two sites are independent
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFirstRunHint } from '../useFirstRunHint';
import { useAuthStore } from '../../stores/authStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

function setupSite(siteId: string | null) {
  mockUseAuthStore.mockImplementation((selector: (s: { activeSiteId: string | null }) => unknown) =>
    selector({ activeSiteId: siteId }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setItem.mockResolvedValue(undefined);
});

describe('useFirstRunHint', () => {
  it('showHint is false while loading (no flash)', () => {
    setupSite('site-a');
    // getItem never resolves during this tick
    getItem.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFirstRunHint());
    expect(result.current.showHint).toBe(false);
  });

  it('showHint is true when the flag has never been set (null)', async () => {
    setupSite('site-a');
    getItem.mockResolvedValue(null);
    const { result } = renderHook(() => useFirstRunHint());
    await waitFor(() => expect(result.current.showHint).toBe(true));
    expect(getItem).toHaveBeenCalledWith('tq.hintDismissed.site-a');
  });

  it('showHint is false when already dismissed', async () => {
    setupSite('site-a');
    getItem.mockResolvedValue('true');
    const { result } = renderHook(() => useFirstRunHint());
    await waitFor(() => expect(result.current.showHint).toBe(false));
  });

  it('dismissHint hides the hint and persists the flag', async () => {
    setupSite('site-a');
    getItem.mockResolvedValue(null);
    const { result } = renderHook(() => useFirstRunHint());
    await waitFor(() => expect(result.current.showHint).toBe(true));

    act(() => result.current.dismissHint());

    expect(result.current.showHint).toBe(false);
    expect(setItem).toHaveBeenCalledWith('tq.hintDismissed.site-a', 'true');
  });

  it('flags are keyed per site — site-a dismissed does not affect site-b', async () => {
    // First render on site-a (dismissed)
    setupSite('site-a');
    getItem.mockResolvedValue('true');
    const { result: resultA } = renderHook(() => useFirstRunHint());
    await waitFor(() => expect(resultA.current.showHint).toBe(false));

    // Separate render on site-b (never dismissed)
    setupSite('site-b');
    getItem.mockResolvedValue(null);
    const { result: resultB } = renderHook(() => useFirstRunHint());
    await waitFor(() => expect(resultB.current.showHint).toBe(true));

    // site-a still hidden
    expect(resultA.current.showHint).toBe(false);
  });

  it('showHint stays false when AsyncStorage rejects (safe fallback)', async () => {
    setupSite('site-a');
    getItem.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useFirstRunHint());
    await waitFor(() => {
      // The effect runs and catch path sets showHint false.
      // We can't distinguish "still loading" from "loaded+false" here by value alone,
      // but after a tick the hook must not be showing the hint.
      expect(result.current.showHint).toBe(false);
    });
  });
});
