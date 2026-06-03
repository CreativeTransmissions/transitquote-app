import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../authStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getItemAsync = SecureStore.getItemAsync as jest.Mock;

const ACTIVE_SITE_KEY = 'tq.activeSiteId';
const SITES_KEY = 'tq.sites';

function resetStore() {
  useAuthStore.setState({
    status: 'loading',
    activeSiteId: null,
    siteUrl: null,
    clientId: null,
    clientSecret: null,
    accessToken: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('authStore.hydrate', () => {
  it('does NOT reject and falls back to unauthenticated when SecureStore throws (no boot hang)', async () => {
    getItemAsync.mockRejectedValue(new Error('KeyStoreException: keystore corrupted'));

    await expect(useAuthStore.getState().hydrate()).resolves.toBeUndefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('sets unauthenticated when no active site is stored', async () => {
    getItemAsync.mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('authenticates when an active site config and token are present', async () => {
    const site = {
      id: 'site1',
      siteUrl: 'https://example.com',
      clientId: 'cid',
      clientSecret: 'secret',
      lastUsed: '2026-06-03T00:00:00.000Z',
    };
    getItemAsync.mockImplementation(async (key: string) => {
      if (key === ACTIVE_SITE_KEY) return 'site1';
      if (key === SITES_KEY) return JSON.stringify([site]);
      if (key === 'tq.token.site1') return 'access-token-123';
      return null;
    });

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('access-token-123');
    expect(state.siteUrl).toBe('https://example.com');
  });

  it('stays unauthenticated when the site config exists but the token is missing', async () => {
    getItemAsync.mockImplementation(async (key: string) => {
      if (key === ACTIVE_SITE_KEY) return 'site1';
      if (key === SITES_KEY)
        return JSON.stringify([
          { id: 'site1', siteUrl: 'https://example.com', clientId: 'c', clientSecret: 's', lastUsed: '' },
        ]);
      return null; // token absent
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
