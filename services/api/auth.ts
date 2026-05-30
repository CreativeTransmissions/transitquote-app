/**
 * Auth API — the two-step OAuth2 authorization-code flow (see docs/API_NOTES.md §1).
 * `rest_login` returns an authorization code; that code is exchanged at the `oauth2` token
 * endpoint for the access token. Services hold no state — the caller persists the token.
 */
import { apiClient } from '../apiClient';
import type { RestLoginResponse, TokenResponse } from '../../types/api';

const LOGIN_PATH = '/wp-json/transitquote/v1/rest_login';
const TOKEN_PATH = '/wp-json/oauth2/access_token';
const LOGOUT_PATH = '/wp-json/transitquote/v1/rest_logout';

export interface LoginCredentials {
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
}

export interface LoginResult {
  accessToken: string;
  roles: string[];
}

export async function login(creds: LoginCredentials): Promise<LoginResult> {
  // Step 1 — username/password (+ client creds) → authorization code.
  const loginRes = await apiClient.post<RestLoginResponse>(LOGIN_PATH, {
    username: creds.username,
    password: creds.password,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });
  if (!loginRes.data?.success || !loginRes.data.code) {
    throw new Error('Login failed');
  }
  const code = loginRes.data.code;
  const roles = loginRes.data.data?.roles ?? [];

  // Step 2 — authorization code → access token (form-encoded, oauth2 namespace).
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  }).toString();
  const tokenRes = await apiClient.post<TokenResponse>(TOKEN_PATH, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!tokenRes.data?.access_token) {
    throw new Error('Token exchange failed');
  }

  return { accessToken: tokenRes.data.access_token, roles };
}

export async function logout(): Promise<void> {
  await apiClient.post(LOGOUT_PATH);
}
