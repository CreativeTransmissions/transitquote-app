/** Jobs API — list (flat), detail (nested via ?id=), and the status/assignment writes. */
import { apiClient } from '../apiClient';
import { ApiActionError } from '../apiError';
import type { ApiResponse, Job, JobDetail, WriteResponse } from '../../types/api';

const PATH = '/wp-json/transitquote/v1/jobs';

export async function getJobs(signal?: AbortSignal): Promise<Job[]> {
  const res = await apiClient.get<ApiResponse<Job[]>>(PATH, { signal });
  if (!res.data?.success) throw new Error('Failed to load jobs');
  return res.data.data;
}

export async function getJobDetail(id: number): Promise<JobDetail> {
  const res = await apiClient.get<ApiResponse<JobDetail>>(PATH, { params: { id } });
  if (!res.data?.success) throw new Error('Failed to load job detail');
  return res.data.data;
}

// Both writes take `id` (not job_id) and return a top-level `success` (docs/API_NOTES.md §10).
// A 200 with success=false is a permanent failure (ApiActionError) — surfaced, not retried.
export interface UpdateStatusPayload {
  id: number;
  status_type_id: number;
}

export interface UpdateAssignedPayload {
  id: number;
  driver_id: number;
}

function assertWriteOk(data: WriteResponse | undefined): void {
  if (!data?.success) {
    throw new ApiActionError(data?.message ?? data?.msg ?? 'The action did not take effect.', data?.code);
  }
}

/** Verified live: JSON body, returns `{ data: <updated job>, success }`. */
export async function updateJobStatus(payload: UpdateStatusPayload): Promise<void> {
  const res = await apiClient.post<WriteResponse>(`${PATH}/update_job_status`, payload);
  assertWriteOk(res.data);
}

/**
 * update_assigned must be sent FORM-ENCODED: the server runs urldecode() on driver_id and crashes
 * (HTTP 500) on a JSON integer (docs/API_NOTES.md §10 — server bug reported). Returns `{ msg, success }`.
 */
export async function updateAssigned(payload: UpdateAssignedPayload): Promise<void> {
  const body = new URLSearchParams({
    id: String(payload.id),
    driver_id: String(payload.driver_id),
  }).toString();
  const res = await apiClient.post<WriteResponse>(`${PATH}/update_assigned`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  assertWriteOk(res.data);
}
