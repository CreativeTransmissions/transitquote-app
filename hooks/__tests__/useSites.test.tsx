/**
 * Tests for useSites — multi-site management (spec §12). Loads the saved site configs from secure
 * storage on mount and switches the active site. Switching MUST wipe the local DB first so the
 * previous site's data never bleeds into the new one; switching to the already-active site is a
 * no-op. The auth store and the local-data wipe are mocked.
 */
const mockListSites = jest.fn();
const mockSwitchSite = jest.fn();
let mockActiveSiteId: string | null;
const mockClearLocalData = jest.fn();

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ listSites: mockListSites, switchSite: mockSwitchSite, activeSiteId: mockActiveSiteId }),
}));
jest.mock('../../database/queries', () => ({ clearLocalData: () => mockClearLocalData() }));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSites } from '../useSites';

const SITES = [
  { id: 'site-1', siteUrl: 'https://a.example', clientId: 'a', clientSecret: 's', lastUsed: 1 },
  { id: 'site-2', siteUrl: 'https://b.example', clientId: 'b', clientSecret: 's', lastUsed: 2 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveSiteId = 'site-1';
  mockListSites.mockResolvedValue(SITES);
  mockSwitchSite.mockResolvedValue(undefined);
});

describe('useSites', () => {
  it('loads the saved sites on mount', async () => {
    const { result } = renderHook(() => useSites());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.sites.map((s) => s.id)).toEqual(['site-1', 'site-2']);
    expect(result.current.activeSiteId).toBe('site-1');
  });

  it('marks loaded even when listing the sites fails', async () => {
    mockListSites.mockRejectedValue(new Error('secure-store unavailable'));
    const { result } = renderHook(() => useSites());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.sites).toEqual([]);
  });

  it('wipes local data then switches when changing to a different site', async () => {
    const { result } = renderHook(() => useSites());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.switchTo('site-2');
    });

    expect(mockClearLocalData).toHaveBeenCalledTimes(1);
    expect(mockSwitchSite).toHaveBeenCalledWith('site-2');
  });

  it('is a no-op when switching to the already-active site', async () => {
    const { result } = renderHook(() => useSites());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.switchTo('site-1');
    });

    expect(mockClearLocalData).not.toHaveBeenCalled();
    expect(mockSwitchSite).not.toHaveBeenCalled();
  });
});
