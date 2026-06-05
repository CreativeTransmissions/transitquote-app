import { getApiErrorMessage, isPermanentFailure, isTokenRejected, ApiActionError } from '../apiError';

const tokenRejected = {
  isAxiosError: true,
  response: { status: 403, data: { code: 'oauth2.authentication.attempt_authentication.invalid_token' } },
};

describe('getApiErrorMessage', () => {
  it('uses the WordPress error message from an axios error response', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: { data: { code: 'rest_invalid', message: 'Invalid credentials', data: { status: 400 } } },
    };
    expect(getApiErrorMessage(error)).toBe('Invalid credentials');
  });

  it('falls back to the axios error message when the body has no message', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
      response: undefined,
    };
    expect(getApiErrorMessage(error)).toBe('Network Error');
  });

  it('uses a plain Error message', () => {
    expect(getApiErrorMessage(new Error('No site configured.'))).toBe('No site configured.');
  });

  it('uses the fallback for unknown error shapes', () => {
    expect(getApiErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getApiErrorMessage('boom', 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('isPermanentFailure', () => {
  it('treats ApiActionError (200 + success:false) as permanent', () => {
    expect(isPermanentFailure(new ApiActionError('No changes were made.', 'no-changes'))).toBe(true);
  });
  it('treats 4xx as permanent', () => {
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 400 } })).toBe(true);
    // A 403 permission denial (no oauth2 token-rejected code) is still permanent.
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 403 } })).toBe(true);
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 403, data: { code: 'rest_forbidden' } } })).toBe(true);
  });
  it('treats a rejected token (403 oauth2.*) as transient so the queued write survives re-login', () => {
    expect(isPermanentFailure(tokenRejected)).toBe(false);
  });
  it('treats 5xx and network errors as transient (retryable)', () => {
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 500 } })).toBe(false);
    expect(isPermanentFailure({ isAxiosError: true, response: undefined })).toBe(false);
  });
  it('treats unknown errors as transient', () => {
    expect(isPermanentFailure(new Error('boom'))).toBe(false);
  });
});

describe('isTokenRejected', () => {
  it('is true for a 403 with an oauth2.* code (token invalid/expired/revoked)', () => {
    expect(isTokenRejected(tokenRejected)).toBe(true);
  });
  it('is false for a 403 permission denial (rest_forbidden)', () => {
    expect(isTokenRejected({ isAxiosError: true, response: { status: 403, data: { code: 'rest_forbidden' } } })).toBe(false);
  });
  it('is false for a 403 with no parseable code, a 401, and non-axios errors', () => {
    expect(isTokenRejected({ isAxiosError: true, response: { status: 403 } })).toBe(false);
    expect(isTokenRejected({ isAxiosError: true, response: { status: 401 } })).toBe(false);
    expect(isTokenRejected(new Error('boom'))).toBe(false);
  });
});
