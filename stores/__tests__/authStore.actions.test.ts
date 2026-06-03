/**
 * Tests for the authStore mutation methods (the existing authStore.test.ts covers hydrate). Backed
 * by a Map-backed SecureStore mock so save→read round-trips work: saveSiteConfig, setAccessToken,
 * clearSession, listSites, switchSite, and the hydrate site-not-found branch.
 */
const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k) : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

import { useAuthStore } from '../authStore';

const SITES_KEY = 'tq.sites';
const ACTIVE_SITE_KEY = 'tq.activeSiteId';

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
  mockStore.clear();
  resetStore();
});

describe('saveSiteConfig', () => {
  it('derives an id from the URL, persists the site + active id, and sets state', async () => {
    const result = await useAuthStore.getState().saveSiteConfig({
      siteUrl: 'https://acme.example',
      clientId: 'cid',
      clientSecret: 'secret',
    });

    expect(result.id).toBe('https_acme_example');
    expect(mockStore.get(ACTIVE_SITE_KEY)).toBe('https_acme_example');
    expect(JSON.parse(mockStore.get(SITES_KEY)!)).toHaveLength(1);

    const state = useAuthStore.getState();
    expect(state.activeSiteId).toBe('https_acme_example');
    expect(state.siteUrl).toBe('https://acme.example');
  });

  it('updates an existing site in place rather than duplicating it', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://acme.example', clientId: 'a', clientSecret: 'x' });
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://acme.example', clientId: 'b', clientSecret: 'y' });

    const sites = JSON.parse(mockStore.get(SITES_KEY)!);
    expect(sites).toHaveLength(1);
    expect(sites[0].clientId).toBe('b');
  });
});

describe('setAccessToken', () => {
  it('persists the token for the active site and authenticates', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://acme.example', clientId: 'c', clientSecret: 's' });
    await useAuthStore.getState().setAccessToken('tok-123');

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().accessToken).toBe('tok-123');
    expect(mockStore.get('tq.token.https_acme_example')).toBe('tok-123');
  });

  it('throws when no site is configured yet', async () => {
    await expect(useAuthStore.getState().setAccessToken('tok')).rejects.toThrow('Cannot set token');
  });
});

describe('clearSession', () => {
  it('deletes the active token and flips to unauthenticated, keeping the site config', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://acme.example', clientId: 'c', clientSecret: 's' });
    await useAuthStore.getState().setAccessToken('tok-123');

    await useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(mockStore.has('tq.token.https_acme_example')).toBe(false);
    expect(mockStore.has(SITES_KEY)).toBe(true); // config retained for re-login
  });
});

describe('listSites', () => {
  it('returns the saved sites', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://a.example', clientId: 'c', clientSecret: 's' });
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://b.example', clientId: 'c', clientSecret: 's' });
    const sites = await useAuthStore.getState().listSites();
    expect(sites.map((s) => s.siteUrl).sort()).toEqual(['https://a.example', 'https://b.example']);
  });

  it('returns [] when none are stored', async () => {
    expect(await useAuthStore.getState().listSites()).toEqual([]);
  });
});

describe('switchSite', () => {
  it('makes another site active and loads its token (authenticated)', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://a.example', clientId: 'c', clientSecret: 's' });
    await useAuthStore.getState().setAccessToken('tok-a');
    const idB = (await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://b.example', clientId: 'c', clientSecret: 's' })).id;
    await useAuthStore.getState().setAccessToken('tok-b');

    await useAuthStore.getState().switchSite('https_a_example');
    expect(useAuthStore.getState().siteUrl).toBe('https://a.example');
    expect(useAuthStore.getState().accessToken).toBe('tok-a');
    expect(useAuthStore.getState().status).toBe('authenticated');

    await useAuthStore.getState().switchSite(idB);
    expect(useAuthStore.getState().accessToken).toBe('tok-b');
  });

  it('is unauthenticated when the target site has no stored token', async () => {
    await useAuthStore.getState().saveSiteConfig({ siteUrl: 'https://a.example', clientId: 'c', clientSecret: 's' });
    // No token saved for this site.
    await useAuthStore.getState().switchSite('https_a_example');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('throws for an unknown site id', async () => {
    await expect(useAuthStore.getState().switchSite('nope')).rejects.toThrow('Unknown site');
  });
});

describe('hydrate — site-not-found branch', () => {
  it('falls back to unauthenticated when the active id has no matching site config', async () => {
    mockStore.set(ACTIVE_SITE_KEY, 'ghost');
    mockStore.set(SITES_KEY, JSON.stringify([{ id: 'other', siteUrl: 'x', clientId: 'c', clientSecret: 's', lastUsed: '' }]));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
