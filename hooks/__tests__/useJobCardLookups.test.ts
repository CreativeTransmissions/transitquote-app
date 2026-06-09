/**
 * Tests for useJobCardLookups — wires three useLiveQuery calls and converts the resulting
 * row arrays into id→name maps. Per CLAUDE.md hook-test rules: loading state (empty arrays),
 * success state (populated maps), and empty tables (empty maps).
 */
import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useJobCardLookups } from '../useJobCardLookups';

jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../database/queries/lookups', () => ({
  servicesQuery: jest.fn(() => 'q:services'),
  vehiclesQuery: jest.fn(() => 'q:vehicles'),
  paymentStatusTypesQuery: jest.fn(() => 'q:payment_status_types'),
}));

const mockLive = useLiveQuery as jest.Mock;

describe('useJobCardLookups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty maps while tables are empty (loading / first-sync state)', () => {
    mockLive.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useJobCardLookups());
    expect(result.current.serviceNames).toEqual({});
    expect(result.current.vehicleNames).toEqual({});
    expect(result.current.paymentStatusNames).toEqual({});
  });

  it('returns populated id→name maps when all tables have rows', () => {
    mockLive
      .mockReturnValueOnce({ data: [{ id: 1, name: 'Same Day' }, { id: 2, name: 'Overnight' }] })
      .mockReturnValueOnce({ data: [{ id: 10, name: 'Van' }, { id: 11, name: 'Motorcycle' }] })
      .mockReturnValueOnce({ data: [{ id: 100, name: 'Paid' }, { id: 101, name: 'Unpaid' }] });

    const { result } = renderHook(() => useJobCardLookups());
    expect(result.current.serviceNames).toEqual({ 1: 'Same Day', 2: 'Overnight' });
    expect(result.current.vehicleNames).toEqual({ 10: 'Van', 11: 'Motorcycle' });
    expect(result.current.paymentStatusNames).toEqual({ 100: 'Paid', 101: 'Unpaid' });
  });

  it('handles partial data (some tables empty)', () => {
    mockLive
      .mockReturnValueOnce({ data: [{ id: 1, name: 'Express' }] })
      .mockReturnValueOnce({ data: [] })
      .mockReturnValueOnce({ data: [{ id: 5, name: 'Pending payment' }] });

    const { result } = renderHook(() => useJobCardLookups());
    expect(result.current.serviceNames).toEqual({ 1: 'Express' });
    expect(result.current.vehicleNames).toEqual({});
    expect(result.current.paymentStatusNames).toEqual({ 5: 'Pending payment' });
  });

  it('overwrites duplicate ids with the last row (last-wins for any duplicate config data)', () => {
    mockLive
      .mockReturnValueOnce({ data: [{ id: 1, name: 'A' }, { id: 1, name: 'B' }] })
      .mockReturnValueOnce({ data: [] })
      .mockReturnValueOnce({ data: [] });

    const { result } = renderHook(() => useJobCardLookups());
    expect(result.current.serviceNames[1]).toBe('B');
  });
});
