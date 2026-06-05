/**
 * Tests for the session mutation hooks: useLogout (best-effort server revoke, then ALWAYS clear the
 * token + wipe local data, even offline) and useOnboarding (validate site URL + credentials, trim,
 * persist to secure storage). normaliseSiteUrl is kept real (tested separately); the auth store and
 * the local-data wipe are mocked.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogout } from '../useLogout';
import { useOnboarding } from '../useOnboarding';
import { logout } from '../../services/api/auth';
import { clearLocalData } from '../../database/queries';

const mockClearSession = jest.fn();
const mockSaveSiteConfig = jest.fn();

jest.mock('../../services/api/auth', () => ({ logout: jest.fn() }));
jest.mock('../../database/queries', () => ({ clearLocalData: jest.fn() }));
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'tok-abc', clearSession: mockClearSession, saveSiteConfig: mockSaveSiteConfig }),
  },
}));

const mockLogout = logout as jest.Mock;
const mockClearLocal = clearLocalData as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogout.mockResolvedValue(undefined);
  mockSaveSiteConfig.mockResolvedValue({ id: 'site-1', siteUrl: 'https://acme.example' });
});

describe('useLogout', () => {
  it('revokes on the server, then clears the session and local data', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current.mutateAsync();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith('tok-abc'); // token passed for server-side revocation
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockClearLocal).toHaveBeenCalledTimes(1);
  });

  it('still clears locally when the server revoke fails (offline / error)', async () => {
    mockLogout.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useLogout(), { wrapper });

    await expect(result.current.mutateAsync()).resolves.toBeUndefined();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockClearLocal).toHaveBeenCalledTimes(1);
  });
});

describe('useOnboarding', () => {
  it('rejects an empty/invalid site URL before saving', async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    await expect(
      result.current.mutateAsync({ siteUrl: '', clientId: 'cid', clientSecret: 'secret' }),
    ).rejects.toThrow('Enter your site URL.');
    expect(mockSaveSiteConfig).not.toHaveBeenCalled();
  });

  it('rejects when the client id/secret are blank', async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    await expect(
      result.current.mutateAsync({ siteUrl: 'https://acme.example', clientId: '  ', clientSecret: '' }),
    ).rejects.toThrow('Enter your client ID and secret.');
    expect(mockSaveSiteConfig).not.toHaveBeenCalled();
  });

  it('persists a normalised URL with trimmed credentials', async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    const config = await result.current.mutateAsync({
      siteUrl: 'https://acme.example',
      clientId: '  cid  ',
      clientSecret: '  secret  ',
    });

    expect(mockSaveSiteConfig).toHaveBeenCalledWith({
      siteUrl: 'https://acme.example',
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(config).toMatchObject({ id: 'site-1' });
  });
});
