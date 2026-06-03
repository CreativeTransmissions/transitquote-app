/**
 * Tests for useLogin — the two-step auth + bootstrap mutation. Covers the guard against logging in
 * before onboarding (no site configured), the success path (persist token, seed /configuration into
 * the local DB, resolve the role for routing), and error propagation.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin } from '../useLogin';
import { login } from '../../services/api/auth';
import { getConfiguration } from '../../services/api/configuration';
import { mapConfiguration } from '../../database/mappers';
import { seedConfiguration } from '../../database/queries';

const setAccessToken = jest.fn();
let mockAuthState: Record<string, unknown>;

jest.mock('../../services/api/auth', () => ({ login: jest.fn() }));
jest.mock('../../services/api/configuration', () => ({ getConfiguration: jest.fn() }));
jest.mock('../../database/mappers', () => ({ mapConfiguration: jest.fn((c: unknown) => c) }));
jest.mock('../../database/queries', () => ({ seedConfiguration: jest.fn() }));
jest.mock('../../stores/authStore', () => ({ useAuthStore: { getState: () => mockAuthState } }));

const mockLogin = login as jest.Mock;
const mockGetConfig = getConfiguration as jest.Mock;
const mockSeed = seedConfiguration as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState = {
    siteUrl: 'https://acme.example',
    clientId: 'cid',
    clientSecret: 'secret',
    setAccessToken,
  };
});

describe('useLogin', () => {
  it('throws when no site is configured (onboarding incomplete)', async () => {
    mockAuthState = { siteUrl: null, clientId: null, clientSecret: null, setAccessToken };
    const { result } = renderHook(() => useLogin(), { wrapper });

    await expect(result.current.mutateAsync({ username: 'u', password: 'p' })).rejects.toThrow(
      'No site configured',
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('persists the token, seeds configuration, and resolves the role', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'tok-xyz', roles: ['driver'] });
    mockGetConfig.mockResolvedValue({ raw: 'config' });

    const { result } = renderHook(() => useLogin(), { wrapper });
    const role = await result.current.mutateAsync({ username: 'api-driver', password: 'driver123' });

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'api-driver',
      password: 'driver123',
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(setAccessToken).toHaveBeenCalledWith('tok-xyz');
    expect(mockSeed).toHaveBeenCalledWith({ raw: 'config' }); // mapConfiguration is identity in the mock
    expect(role).toBe('driver');
  });

  it('resolves dispatch role for a dispatcher', async () => {
    mockLogin.mockResolvedValue({ accessToken: 't', roles: ['dispatch'] });
    mockGetConfig.mockResolvedValue({});
    const { result } = renderHook(() => useLogin(), { wrapper });
    await expect(result.current.mutateAsync({ username: 'd', password: 'p' })).resolves.toBe('dispatch');
  });

  it('propagates an auth failure and does not seed config', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    const { result } = renderHook(() => useLogin(), { wrapper });

    await expect(result.current.mutateAsync({ username: 'u', password: 'bad' })).rejects.toThrow(
      'Invalid credentials',
    );
    expect(setAccessToken).not.toHaveBeenCalled();
    expect(mockSeed).not.toHaveBeenCalled();
  });
});
