import { describe, it, expect } from '@jest/globals';
import { resolveRole, isDispatcher, isDriver, canAssignTo } from '../roleGuards';

describe('roleGuards', () => {
  it('resolves role from the roles array, not display strings', () => {
    expect(resolveRole(['driver'])).toBe('driver');
    expect(resolveRole(['dispatch'])).toBe('dispatch');
    expect(resolveRole(['administrator'])).toBe('administrator');
    expect(resolveRole(['Administrator', 'driver'])).toBe('administrator'); // admin wins, case-insensitive
  });

  it('treats dispatch and administrator as dispatchers', () => {
    expect(isDispatcher(['dispatch'])).toBe(true);
    expect(isDispatcher(['administrator'])).toBe(true);
    expect(isDispatcher(['driver'])).toBe(false);
    expect(isDriver(['driver'])).toBe(true);
  });

  it('enforces can_assign_to only for allowed driver ids', () => {
    expect(canAssignTo([2, 3], 3)).toBe(true);
    expect(canAssignTo([2, 3], 9)).toBe(false);
    expect(canAssignTo([], 1)).toBe(false);
  });
});
