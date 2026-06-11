/**
 * Auth API — the two-step OAuth2 authorization-code flow (see docs/API_NOTES.md §1).
 * `rest_login` returns an authorization code; that code is exchanged at the `oauth2` token
 * endpoint for the access token. Services hold no state — the caller persists the token.
 */
import { apiClient } from '../apiClient';
import { ApiActionError } from '../apiError';
import type { ResetPasswordResponse, RestLoginResponse, TokenResponse } from '../../types/api';

const LOGIN_PATH = '/wp-json/transitquote/v1/rest_login';
const TOKEN_PATH = '/wp-json/oauth2/access_token';
const LOGOUT_PATH = '/wp-json/transitquote/v1/rest_logout';
const RESET_PASSWORD_PATH = '/wp-json/transitquote/v1/reset_password';

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

export interface ResetPasswordParams {
  /** Email address or WP login — same value the user types on the Sign in screen. */
  username: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Trigger the standard WordPress password-reset email (issue #14). Unauthenticated apart from
 * the client credentials; the reset itself completes in the browser via the emailed link.
 * Enumeration-safe: the server answers success whether or not the account exists. Resolves to
 * the server's user-facing message ("If an account exists… a password reset email has been sent.").
 */
export async function resetPassword(params: ResetPasswordParams): Promise<string> {
  const res = await apiClient.post<ResetPasswordResponse>(RESET_PASSWORD_PATH, {
    username: params.username,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  if (!res.data?.success) {
    // e.g. invalid client credentials → { success: false, message: "Not authorized" }.
    throw new ApiActionError(res.data?.message || 'Password reset request failed');
  }
  return res.data.message || 'If an account exists for that username or email, a password reset email has been sent.';
}

/**
 * Logout / server-side token revocation. The server requires the token as an `access_token`
 * request param (form-encoded) — without it `rest_logout` returns 400 `rest_missing_callback_param`
 * and the token is never revoked (the Authorization header alone is NOT sufficient here).
 * Stateless by design: the caller supplies the token it persisted.
 */
export async function logout(accessToken: string): Promise<void> {
  const body = new URLSearchParams({ access_token: accessToken }).toString();
  await apiClient.post(LOGOUT_PATH, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}
