/**
 * Axios client for the TransitQuote API. The single network entry point — no `fetch`
 * elsewhere (CLAUDE.md). Per request it injects the active site's base URL and Bearer token
 * from `authStore`. On 401 it clears the session, which drives the route guard back to login.
 *
 * `parseApiBody` defends against the PHP `Deprecated` warning currently prepended to
 * /configuration and /jobs (docs/API_NOTES.md §5). This is TEMPORARY — the server team is
 * fixing the warning; once shipped the strip is a harmless no-op and can be removed.
 */
import { create, isAxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { parseApiBody } from './parseApiBody';

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

// 401 → clear the session (token expired/revoked). The route guard handles the redirect.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      await useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
