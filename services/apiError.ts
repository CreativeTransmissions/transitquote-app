/**
 * Extract a user-facing message from an API/network error.
 *
 * Success responses carry no `message` (docs/API_NOTES.md §2), but WordPress error responses do
 * (`{ code, message, data.status }`). Prefer that; fall back to the axios/Error message, then a
 * generic string. Never surface a raw stack to the user.
 */
import { isAxiosError } from 'axios';

/**
 * Raised when a write endpoint returns HTTP 200 but `data.success === false` (e.g. "no-changes")
 * — the server accepted the request but made no change. Treated like a 4xx by the outbox: a
 * permanent failure that must be surfaced to the user, NOT retried.
 */
export class ApiActionError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiActionError';
    this.code = code;
  }
}

/**
 * Whether an error means the access token itself was rejected (invalid / expired / revoked) — as
 * opposed to a permission denial. The hardened server returns **403** with an `oauth2.*` error code
 * for a bad token (a *missing* Authorization header is 401; an authenticated-but-unauthorized action
 * is 403 `rest_forbidden`). This is the single boundary that distinguishes those cases — used both to
 * clear the session (apiClient) and to keep a token-expiry mid-write retryable (isPermanentFailure).
 * See docs/API_NOTES.md §11.
 */
export function isTokenRejected(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const data = error.response.data;
  if (!data || typeof data !== 'object' || !('code' in data)) return false;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('oauth2.');
}

/**
 * Whether an error means the action should NOT be retried (permanent). True for 4xx responses and
 * ApiActionError (200 + success:false). Network errors and 5xx are transient → retry. A rejected
 * token (403 `oauth2.*`) is ALSO transient: the session is cleared and re-login mints a fresh token,
 * so the queued write must survive to retry — not be burned as a permanent failure. Drives the
 * outbox flush policy (spec §11.5).
 */
export function isPermanentFailure(error: unknown): boolean {
  if (error instanceof ApiActionError) return true;
  if (isTokenRejected(error)) return false;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    return status !== undefined && status >= 400 && status < 500;
  }
  return false;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim() !== '') return message;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
