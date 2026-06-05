/**
 * Axios client for the TransitQuote API. The single network entry point — no `fetch`
 * elsewhere (CLAUDE.md). Per request it injects the active site's base URL and Bearer token
 * from `authStore`. On 401 it clears the session, which drives the route guard back to login.
 *
 * `parseApiBody` recovers the JSON envelope when the backend leaks PHP warnings/errors before it
 * (docs/API_NOTES.md §5). This is PERMANENT defence-in-depth, not a temporary workaround — the
 * server has regressed PHP noise into REST JSON more than once (a `Deprecated` warning on
 * /configuration + /jobs, then a `wpdberror` SQL block on /jobs?id= on 2026-06-02). Do not assume
 * the body is always clean JSON.
 */
import { create, isAxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { parseApiBody } from './parseApiBody';
import { isTokenRejected } from './apiError';

export { parseApiBody };

export const apiClient: AxiosInstance = create({
  timeout: 20000,
  // Replace the default transform so axios hands us the raw string to clean before parsing.
  transformResponse: [parseApiBody],
});

// Inject base URL + auth header from the active session on every request.
apiClient.interceptors.request.use((config) => {
  const { siteUrl, accessToken } = useAuthStore.getState();
  if (siteUrl) config.baseURL = siteUrl;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Token gone bad → clear the session; the route guard handles the redirect to login.
// Two server shapes mean "your token is no longer good": a 401 (no/!Bearer Authorization header)
// and a 403 with an `oauth2.*` code (token invalid/expired/revoked — see isTokenRejected). A 403
// `rest_forbidden` is an authenticated *permission* denial and must NOT log the user out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || isTokenRejected(error)) {
      await useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
