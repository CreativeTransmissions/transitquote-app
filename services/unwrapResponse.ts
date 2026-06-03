/**
 * Unwrap a read endpoint's `{ data, success }` envelope, validating BOTH that the call succeeded
 * and that `data` is actually present (and array-shaped where a list is expected).
 *
 * Checking `success` alone is not enough: the leaked-PHP recovery path (parseApiBody) and thin/
 * malformed responses can yield `{ success: true }` with a null/undefined `data`, which then
 * crashes the mapping layer on the first property access (e.g. `config.team_settings`,
 * `jobs.map(...)`). Failing here with a clear message keeps the error in the network layer where
 * the three-state (loading/error/offline) UI can show it.
 */
import type { ApiResponse } from '../types/api';

export function unwrapData<T>(body: ApiResponse<T> | undefined, label: string, expectArray = false): T {
  if (!body?.success) throw new Error(`Failed to load ${label}`);
  const data = body.data;
  if (data == null) throw new Error(`Failed to load ${label}`);
  if (expectArray && !Array.isArray(data)) throw new Error(`Failed to load ${label}`);
  return data;
}
