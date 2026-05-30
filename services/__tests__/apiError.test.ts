import { getApiErrorMessage, isPermanentFailure, ApiActionError } from '../apiError';

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
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 403 } })).toBe(true);
  });
  it('treats 5xx and network errors as transient (retryable)', () => {
    expect(isPermanentFailure({ isAxiosError: true, response: { status: 500 } })).toBe(false);
    expect(isPermanentFailure({ isAxiosError: true, response: undefined })).toBe(false);
  });
  it('treats unknown errors as transient', () => {
    expect(isPermanentFailure(new Error('boom'))).toBe(false);
  });
});
