/**
 * Tests for the apiClient interceptors — the single network entry point.
 *  - request: injects the active site's base URL + Bearer token from authStore
 *  - response: a 401 clears the session (which drives the route guard back to login)
 * Also pins the transformResponse wiring to parseApiBody (the leaked-PHP recovery is defence-in-
 * depth that must never be silently dropped).
 */
const clearSession = jest.fn();
let mockStoreState: { siteUrl: string | null; accessToken: string | null; clearSession: jest.Mock };

jest.mock('../../stores/authStore', () => ({
  useAuthStore: { getState: () => mockStoreState },
}));

import { apiClient, parseApiBody } from '../apiClient';
import type { InternalAxiosRequestConfig } from 'axios';

type RequestHandler = (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
type RejectedHandler = (e: unknown) => Promise<unknown>;

// Reach into the registered interceptor handlers to exercise them directly.
const requestFulfilled = (apiClient.interceptors.request as unknown as {
  handlers: { fulfilled: RequestHandler }[];
}).handlers[0].fulfilled;

const responseRejected = (apiClient.interceptors.response as unknown as {
  handlers: { rejected: RejectedHandler }[];
}).handlers[0].rejected;

function configWith(): InternalAxiosRequestConfig {
  return { headers: {} } as InternalAxiosRequestConfig;
}

beforeEach(() => {
  clearSession.mockReset();
  mockStoreState = { siteUrl: 'https://acme.example', accessToken: 'tok-123', clearSession };
});

describe('request interceptor', () => {
  it('injects the active base URL and Bearer token', () => {
    const config = requestFulfilled(configWith());
    expect(config.baseURL).toBe('https://acme.example');
    expect(config.headers.Authorization).toBe('Bearer tok-123');
  });

  it('omits the Authorization header when there is no token', () => {
    mockStoreState = { siteUrl: 'https://acme.example', accessToken: null, clearSession };
    const config = requestFulfilled(configWith());
    expect(config.baseURL).toBe('https://acme.example');
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('leaves the base URL unset when no site is configured', () => {
    mockStoreState = { siteUrl: null, accessToken: null, clearSession };
    const config = requestFulfilled(configWith());
    expect(config.baseURL).toBeUndefined();
  });
});

describe('response interceptor', () => {
  it('clears the session on a 401 and re-rejects the error', async () => {
    const error = { isAxiosError: true, response: { status: 401 } };
    await expect(responseRejected(error)).rejects.toBe(error);
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('does NOT clear the session on a non-401 error', async () => {
    const error = { isAxiosError: true, response: { status: 500 } };
    await expect(responseRejected(error)).rejects.toBe(error);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('ignores non-axios errors', async () => {
    const error = new Error('boom');
    await expect(responseRejected(error)).rejects.toBe(error);
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe('transformResponse wiring', () => {
  it('uses parseApiBody to recover the JSON envelope (defence-in-depth)', () => {
    const transforms = apiClient.defaults.transformResponse;
    expect(transforms).toContain(parseApiBody);
  });
});
