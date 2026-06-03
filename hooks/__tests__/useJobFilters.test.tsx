/**
 * Tests for useJobFilters — persists the last-used job filter to AsyncStorage (filters aren't
 * sensitive; tokens/creds live in secure-store). Restores on mount, merges over the empty default,
 * tolerates malformed persisted JSON, and persists on set/clear.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useJobFilters } from '../useJobFilters';
import { EMPTY_FILTERS } from '../../utils/jobFilter';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const KEY = 'tq.jobFilters';

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
});

describe('useJobFilters', () => {
  it('starts with empty filters and marks loaded when nothing is persisted', async () => {
    const { result } = renderHook(() => useJobFilters());
    expect(result.current.filters).toEqual(EMPTY_FILTERS);
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
  });

  it('restores persisted filters, merged over the empty default', async () => {
    getItem.mockResolvedValue(JSON.stringify({ statusIds: [3, 5], driverId: 7 }));
    const { result } = renderHook(() => useJobFilters());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.filters).toEqual({ statusIds: [3, 5], driverId: 7, dateFrom: null, dateTo: null });
  });

  it('falls back to empty filters on malformed persisted JSON', async () => {
    getItem.mockResolvedValue('{not valid json');
    const { result } = renderHook(() => useJobFilters());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.filters).toEqual(EMPTY_FILTERS);
  });

  it('persists and applies a new filter via setFilters', async () => {
    const { result } = renderHook(() => useJobFilters());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const next = { statusIds: [9], driverId: null, dateFrom: '2026-06-01', dateTo: null };
    act(() => result.current.setFilters(next));

    expect(result.current.filters).toEqual(next);
    expect(setItem).toHaveBeenCalledWith(KEY, JSON.stringify(next));
  });

  it('clear resets to the empty filters and persists', async () => {
    getItem.mockResolvedValue(JSON.stringify({ statusIds: [3] }));
    const { result } = renderHook(() => useJobFilters());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.clear());

    expect(result.current.filters).toEqual(EMPTY_FILTERS);
    expect(setItem).toHaveBeenLastCalledWith(KEY, JSON.stringify(EMPTY_FILTERS));
  });
});
