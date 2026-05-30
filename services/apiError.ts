/**
 * Extract a user-facing message from an API/network error.
 *
 * Success responses carry no `message` (docs/API_NOTES.md §2), but WordPress error responses do
 * (`{ code, message, data.status }`). Prefer that; fall back to the axios/Error message, then a
 * generic string. Never surface a raw stack to the user.
 */
import { isAxiosError } from 'axios';

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
