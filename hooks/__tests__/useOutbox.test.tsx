/**
 * Tests for useOutbox — derives the UI's outbox view from the reactive queue: total pending count
 * (sync badge), failed items (surfaced on the affected job), and a per-job state map where FAILED
 * takes precedence over pending. useLiveQuery is mocked to feed the queue rows.
 */
import { renderHook } from '@testing-library/react-native';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useOutbox } from '../useOutbox';
import type { OutboxRow } from '../../database/schema';

jest.mock('../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

const mockLive = useLiveQuery as jest.Mock;

function row(id: number, jobId: number, status: OutboxRow['status']): OutboxRow {
  return {
    id,
    actionType: 'UPDATE_STATUS',
    payload: { id: jobId, status_type_id: 5 },
    status,
    attempts: 0,
    lastError: null,
    createdAt: '2026-06-03 10:00:00',
  };
}

function feed(rows: OutboxRow[]) {
  mockLive.mockReturnValue({ data: rows, error: undefined });
}

beforeEach(() => mockLive.mockReset());

describe('useOutbox', () => {
  it('reports an empty queue', () => {
    feed([]);
    const { result } = renderHook(() => useOutbox());
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failed).toEqual([]);
    expect(result.current.stateByJob.size).toBe(0);
  });

  it('counts pending + in_progress and maps each job to "pending"', () => {
    feed([row(1, 100, 'pending'), row(2, 101, 'in_progress')]);
    const { result } = renderHook(() => useOutbox());
    expect(result.current.pendingCount).toBe(2);
    expect(result.current.stateByJob.get(100)).toBe('pending');
    expect(result.current.stateByJob.get(101)).toBe('pending');
  });

  it('collects failed items and excludes them from the pending count', () => {
    feed([row(1, 100, 'pending'), row(2, 101, 'failed')]);
    const { result } = renderHook(() => useOutbox());
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.failed.map((r) => r.id)).toEqual([2]);
    expect(result.current.stateByJob.get(101)).toBe('failed');
  });

  it('lets failed take precedence over pending for the same job', () => {
    // Same job has both a pending and a failed action — the card should show the failed state.
    feed([row(1, 100, 'pending'), row(2, 100, 'failed')]);
    const { result } = renderHook(() => useOutbox());
    expect(result.current.stateByJob.get(100)).toBe('failed');
  });

  it('keeps failed precedence regardless of row order (failed seen first)', () => {
    feed([row(2, 100, 'failed'), row(1, 100, 'pending')]);
    const { result } = renderHook(() => useOutbox());
    expect(result.current.stateByJob.get(100)).toBe('failed');
  });
});
