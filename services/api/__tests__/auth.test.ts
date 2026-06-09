/**
 * Tests for the auth API — the two-step OAuth2 flow (docs/API_NOTES.md §1): rest_login returns an
 * authorization code, which is exchanged (form-encoded) at the oauth2 token endpoint for the access
 * token. Covers the happy path, both failure points, role defaulting, and logout.
 */
import { apiClient } from '../../apiClient';
import { login, logout } from '../auth';

jest.mock('../../apiClient', () => ({ apiClient: { post: jest.fn() } }));

const post = apiClient.post as jest.Mock;
const LOGIN_PATH = '/wp-json/transitquote/v1/rest_login';
const TOKEN_PATH = '/wp-json/oauth2/access_token';
const LOGOUT_PATH = '/wp-json/transitquote/v1/rest_logout';

const creds = { username: 'u', password: 'p', clientId: 'cid', clientSecret: 'secret' };

beforeEach(() => jest.clearAllMocks());

describe('login', () => {
  it('exchanges credentials → code → access token and returns roles', async () => {
    post
      .mockResolvedValueOnce({ data: { success: true, code: 'AUTH_CODE', data: { roles: ['driver'] } } })
      .mockResolvedValueOnce({ data: { access_token: 'tok-xyz' } });

    const result = await login(creds);

    // Step 1: JSON credentials to rest_login.
    expect(post).toHaveBeenNthCalledWith(1, LOGIN_PATH, {
      username: 'u',
      password: 'p',
      client_id: 'cid',
      client_secret: 'secret',
    });
    // Step 2: form-encoded authorization_code grant to the oauth2 endpoint.
    const [, body, config] = post.mock.calls[1];
    expect(post.mock.calls[1][0]).toBe(TOKEN_PATH);
    expect(typeof body).toBe('string');
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=AUTH_CODE');
    expect(body).toContain('client_id=cid');
    expect(config).toEqual({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    expect(result).toEqual({ accessToken: 'tok-xyz', roles: ['driver'] });
  });

  it('defaults roles to [] when the login response omits them', async () => {
    post
      .mockResolvedValueOnce({ data: { success: true, code: 'AUTH_CODE' } })
      .mockResolvedValueOnce({ data: { access_token: 'tok' } });
    const result = await login(creds);
    expect(result.roles).toEqual([]);
  });

  it('throws and does not exchange when step 1 fails', async () => {
    post.mockResolvedValueOnce({ data: { success: false } });
    await expect(login(creds)).rejects.toThrow('Login failed');
    expect(post).toHaveBeenCalledTimes(1); // no token exchange
  });

  it('throws when the token exchange returns no access_token', async () => {
    post
      .mockResolvedValueOnce({ data: { success: true, code: 'AUTH_CODE' } })
      .mockResolvedValueOnce({ data: {} });
    await expect(login(creds)).rejects.toThrow('Token exchange failed');
  });
});

describe('logout', () => {
  it('posts the access_token form-encoded to the logout endpoint', async () => {
    post.mockResolvedValue({ data: { success: true } });
    await logout('tok-xyz');
    const [path, body, config] = post.mock.calls[0];
    expect(path).toBe(LOGOUT_PATH);
    expect(body).toBe('access_token=tok-xyz');
    expect(config).toEqual({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  });
});
