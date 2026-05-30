/** Jobs API — list (flat), detail (nested via ?id=), and the status/assignment writes. */
import { apiClient } from '../apiClient';
import type { ApiResponse, Job, JobDetail } from '../../types/api';

const PATH = '/wp-json/transitquote/v1/jobs';

export async function getJobs(): Promise<Job[]> {
  const res = await apiClient.get<ApiResponse<Job[]>>(PATH);
  if (!res.data?.success) throw new Error('Failed to load jobs');
  return res.data.data;
}

export async function getJobDetail(id: number): Promise<JobDetail> {
  const res = await apiClient.get<ApiResponse<JobDetail>>(PATH, { params: { id } });
  if (!res.data?.success) throw new Error('Failed to load job detail');
  return res.data.data;
}

// ⚠️ UNVERIFIED write payloads. The spec does not define these request bodies and they have
// not been exercised live (they mutate test data). The shapes below are best-guess — verify
// against the live API before wiring the outbox flusher (BACKLOG: "write endpoint shapes").
export interface UpdateStatusPayload {
  job_id: number;
  status_type_id: number;
}

export interface UpdateAssignedPayload {
  job_id: number;
  driver_id: number;
}

export async function updateJobStatus(payload: UpdateStatusPayload): Promise<void> {
  const res = await apiClient.post<ApiResponse<unknown>>(`${PATH}/update_job_status`, payload);
  if (!res.data?.success) throw new Error('Failed to update job status');
}

export async function updateAssigned(payload: UpdateAssignedPayload): Promise<void> {
  const res = await apiClient.post<ApiResponse<unknown>>(`${PATH}/update_assigned`, payload);
  if (!res.data?.success) throw new Error('Failed to assign driver');
}
