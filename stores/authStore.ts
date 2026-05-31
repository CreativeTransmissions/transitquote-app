/**
 * Session/auth store (Zustand).
 *
 * Holds the active site's URL + OAuth2 client credentials and the current access token.
 * Tokens and client credentials live in expo-secure-store — never AsyncStorage (CLAUDE.md).
 * Multi-site is modelled from the start (a keyed list of site configs + an active id); the
 * switching UI lands later (ROADMAP M4), but the storage shape supports it now.
 *
 * apiClient reads `siteUrl`/`accessToken` from here at request time. On 401 the client calls
 * `clearSession()`, which flips `status` to 'unauthenticated' and drives the route guard to login.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { SiteConfig } from '../types/app';

const SITES_KEY = 'tq.sites';
const ACTIVE_SITE_KEY = 'tq.activeSiteId';
const tokenKey = (siteId: string) => `tq.token.${siteId}`;

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  activeSiteId: string | null;
  siteUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  accessToken: string | null;

  /** Load the active site config + its token from secure storage. Call once on boot. */
  hydrate: () => Promise<void>;
  /** Persist a site config (creating or updating it) and make it active. */
  saveSiteConfig: (config: Omit<SiteConfig, 'id' | 'lastUsed'> & { id?: string }) => Promise<SiteConfig>;
  /** Persist the access token for the active site and mark the session authenticated. */
  setAccessToken: (token: string) => Promise<void>;
  /** Clear the active site's token (logout / 401). Site config is retained for re-login. */
  clearSession: () => Promise<void>;
  /** All saved site configs (for the multi-site switcher). */
  listSites: () => Promise<SiteConfig[]>;
  /** Make another saved site active, loading its stored token (status follows token presence). */
  switchSite: (id: string) => Promise<void>;
}

async function readSites(): Promise<SiteConfig[]> {
  const raw = await SecureStore.getItemAsync(SITES_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SiteConfig[]) : [];
  } catch {
    return [];
  }
}

// Stable, secure-store-safe id derived from the site URL (keys allow [A-Za-z0-9._-]).
function siteIdFromUrl(url: string): string {
  return url.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  activeSiteId: null,
  siteUrl: null,
  clientId: null,
  clientSecret: null,
  accessToken: null,

  hydrate: async () => {
    const activeSiteId = await SecureStore.getItemAsync(ACTIVE_SITE_KEY);
    if (!activeSiteId) {
      set({ status: 'unauthenticated' });
      return;
    }
    const sites = await readSites();
    const site = sites.find((s) => s.id === activeSiteId);
    if (!site) {
      set({ status: 'unauthenticated' });
      return;
    }
    const token = await SecureStore.getItemAsync(tokenKey(activeSiteId));
    set({
      activeSiteId,
      siteUrl: site.siteUrl,
      clientId: site.clientId,
      clientSecret: site.clientSecret,
      accessToken: token,
      status: token ? 'authenticated' : 'unauthenticated',
    });
  },

  saveSiteConfig: async (config) => {
    const id = config.id ?? siteIdFromUrl(config.siteUrl);
    const lastUsed = new Date().toISOString();
    const full: SiteConfig = { id, siteUrl: config.siteUrl, clientId: config.clientId, clientSecret: config.clientSecret, lastUsed };

    const sites = await readSites();
    const next = [...sites.filter((s) => s.id !== id), full];
    await SecureStore.setItemAsync(SITES_KEY, JSON.stringify(next));
    await SecureStore.setItemAsync(ACTIVE_SITE_KEY, id);

    set({
      activeSiteId: id,
      siteUrl: full.siteUrl,
      clientId: full.clientId,
      clientSecret: full.clientSecret,
    });
    return full;
  },

  setAccessToken: async (token) => {
    const { activeSiteId } = get();
    if (!activeSiteId) throw new Error('Cannot set token before a site is configured');
    await SecureStore.setItemAsync(tokenKey(activeSiteId), token);
    set({ accessToken: token, status: 'authenticated' });
  },

  clearSession: async () => {
    const { activeSiteId } = get();
    if (activeSiteId) await SecureStore.deleteItemAsync(tokenKey(activeSiteId));
    set({ accessToken: null, status: 'unauthenticated' });
  },

  listSites: async () => readSites(),

  switchSite: async (id) => {
    const sites = await readSites();
    const site = sites.find((s) => s.id === id);
    if (!site) throw new Error('Unknown site');
    await SecureStore.setItemAsync(ACTIVE_SITE_KEY, id);
    const token = await SecureStore.getItemAsync(tokenKey(id));
    set({
      activeSiteId: id,
      siteUrl: site.siteUrl,
      clientId: site.clientId,
      clientSecret: site.clientSecret,
      accessToken: token,
      status: token ? 'authenticated' : 'unauthenticated',
    });
  },
}));
