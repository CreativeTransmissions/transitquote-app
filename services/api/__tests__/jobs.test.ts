/**
 * Tests for the jobs API functions. Highest-value here is the update_assigned regression guard:
 * the server runs urldecode() on driver_id and returns HTTP 500 on a JSON integer, so that write
 * MUST go out form-encoded (docs/API_NOTES.md §10). We also cover the read unwrap and the
 * 200+success:false → ApiActionError contract that the outbox depends on for its retry policy.
 */
jest.mock('../../apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

import { apiClient } from '../../apiClient';
import { getJobs, getJobDetail, updateJobStatus, updateAssigned } from '../jobs';
import { ApiActionError } from '../../apiError';

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const PATH = '/wp-json/transitquote/v1/jobs';

beforeEach(() => jest.clearAllMocks());

describe('getJobs', () => {
  it('requests the list (forwarding the abort signal) and unwraps data', async () => {
    const signal = new AbortController().signal;
    get.mockResolvedValue({ data: { data: [{ id: '1' }], success: true } });

    const result = await getJobs(signal);

    expect(get).toHaveBeenCalledWith(PATH, { signal });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('throws when the envelope reports failure', async () => {
    get.mockResolvedValue({ data: { success: false } });
    await expect(getJobs()).rejects.toThrow('Failed to load jobs');
  });
});

describe('getJobDetail', () => {
  it('requests by id param and unwraps the detail object', async () => {
    get.mockResolvedValue({ data: { data: { id: '7' }, success: true } });
    const result = await getJobDetail(7);
    expect(get).toHaveBeenCalledWith(PATH, { params: { id: 7 } });
    expect(result).toEqual({ id: '7' });
  });
});

describe('updateJobStatus', () => {
  it('posts the JSON payload and resolves on success', async () => {
    post.mockResolvedValue({ data: { success: true } });
    await expect(updateJobStatus({ id: 1, status_type_id: 5 })).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(`${PATH}/update_job_status`, { id: 1, status_type_id: 5 });
  });

  it('throws ApiActionError on a 200 + success:false (permanent, surfaced not retried)', async () => {
    post.mockResolvedValue({ data: { success: false, message: 'No changes made', code: 'no_change' } });
    await expect(updateJobStatus({ id: 1, status_type_id: 5 })).rejects.toMatchObject({
      name: 'ApiActionError',
      message: 'No changes made',
      code: 'no_change',
    });
  });
});

describe('updateAssigned — form-encoding regression (server 500s on a JSON integer)', () => {
  it('sends a form-urlencoded body, NOT JSON', async () => {
    post.mockResolvedValue({ data: { success: true } });

    await updateAssigned({ id: 12, driver_id: 432 });

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe(`${PATH}/update_assigned`);
    // Body must be the urlencoded string, and driver_id must be a STRING in it (not a JS number).
    expect(typeof body).toBe('string');
    expect(body).toBe('id=12&driver_id=432');
    expect(config).toEqual({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  });

  it('falls back to msg when an error response has no message field', async () => {
    post.mockResolvedValue({ data: { success: false, msg: 'Not permitted' } });
    await expect(updateAssigned({ id: 12, driver_id: 432 })).rejects.toBeInstanceOf(ApiActionError);
    await expect(updateAssigned({ id: 12, driver_id: 432 })).rejects.toThrow('Not permitted');
  });
});
