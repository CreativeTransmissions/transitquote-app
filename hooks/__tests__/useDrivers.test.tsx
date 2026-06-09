/**
 * Tests for useDrivers / useAssignableDrivers. The assignable-driver logic is security-adjacent:
 * dispatchers/admins may assign to anyone, but a decentralized driver may assign ONLY within their
 * own record's can_assign_to (a single driver id — CLAUDE.md §"Role & Assignment Mode"). The server
 * also enforces this; the hook guards the UX. useLiveQuery feeds the drivers list; useRole is mocked.
 */
import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRole } from '../useRole';
import { useDrivers, useAssignableDrivers } from '../useDrivers';
import type { DriverRow } from '../../database/schema';
import type { RoleInfo } from '../useRole';

jest.mock('../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../useRole', () => ({ useRole: jest.fn() }));

const mockLive = useLiveQuery as jest.Mock;
const mockRole = useRole as jest.Mock;

function driver(id: number, canAssignTo: number | null = null): DriverRow {
  return {
    id,
    wpUserId: null,
    firstName: `D${id}`,
    lastName: 'X',
    email: null,
    phone: null,
    available: true,
    canAssignTo,
    roles: null,
  };
}

function role(overrides: Partial<RoleInfo>): RoleInfo {
  return {
    role: null,
    roles: [],
    assignmentMode: 'Decentralized',
    isDriver: false,
    isDispatcher: false,
    isDecentralized: true,
    driverId: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockLive.mockReset();
  mockRole.mockReset();
});

describe('useDrivers', () => {
  it('returns the reactive drivers list', () => {
    mockLive.mockReturnValue({ data: [driver(1), driver(2)], error: undefined });
    const { result } = renderHook(() => useDrivers());
    expect(result.current.map((d) => d.id)).toEqual([1, 2]);
  });
});

describe('useAssignableDrivers', () => {
  it('lets a dispatcher assign to anyone', () => {
    mockLive.mockReturnValue({ data: [driver(1), driver(2), driver(3)], error: undefined });
    mockRole.mockReturnValue(role({ isDispatcher: true, role: 'dispatch' }));

    const { result } = renderHook(() => useAssignableDrivers());
    expect(result.current.drivers.map((d) => d.id)).toEqual([1, 2, 3]);
    expect(result.current.canAssign).toBe(true);
  });

  it('reports canAssign=false for a dispatcher when there are no drivers', () => {
    mockLive.mockReturnValue({ data: [], error: undefined });
    mockRole.mockReturnValue(role({ isDispatcher: true }));

    const { result } = renderHook(() => useAssignableDrivers());
    expect(result.current.drivers).toEqual([]);
    expect(result.current.canAssign).toBe(false);
  });

  it('limits a decentralized driver to their own can_assign_to target', () => {
    mockLive.mockReturnValue({ data: [driver(5, 9), driver(9), driver(12)], error: undefined });
    mockRole.mockReturnValue(role({ isDriver: true, role: 'driver', driverId: 5 }));

    const { result } = renderHook(() => useAssignableDrivers());
    expect(result.current.drivers.map((d) => d.id)).toEqual([9]); // only the can_assign_to target
    expect(result.current.canAssign).toBe(true);
  });

  it('gives a driver with no can_assign_to nobody to assign to', () => {
    mockLive.mockReturnValue({ data: [driver(5, null), driver(9)], error: undefined });
    mockRole.mockReturnValue(role({ isDriver: true, driverId: 5 }));

    const { result } = renderHook(() => useAssignableDrivers());
    expect(result.current.drivers).toEqual([]);
    expect(result.current.canAssign).toBe(false);
  });

  it('returns nobody when the current driver is not in the drivers list', () => {
    mockLive.mockReturnValue({ data: [driver(9), driver(12)], error: undefined });
    mockRole.mockReturnValue(role({ isDriver: true, driverId: 5 })); // 5 absent

    const { result } = renderHook(() => useAssignableDrivers());
    expect(result.current.drivers).toEqual([]);
    expect(result.current.canAssign).toBe(false);
  });
});
