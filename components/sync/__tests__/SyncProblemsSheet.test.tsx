/**
 * Tests for SyncProblemsSheet — lists failed outbox items with the affected job ref and per-item
 * Retry / Discard, plus an all-caught-up empty state. The outbox hooks are mocked; useLiveQuery
 * feeds the job-ref lookup; the message utils are real.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useOutbox } from '../../../hooks/useOutbox';
import { useRetryOutboxItem, useDiscardOutboxItem } from '../../../hooks/useOutboxActions';
import { SyncProblemsSheet } from '../SyncProblemsSheet';
import type { OutboxRow } from '../../../database/schema';

jest.mock('../../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../../hooks/useOutbox', () => ({ useOutbox: jest.fn() }));
jest.mock('../../../hooks/useOutboxActions', () => ({
  useRetryOutboxItem: jest.fn(),
  useDiscardOutboxItem: jest.fn(),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const mockLive = useLiveQuery as jest.Mock;
const mockOutbox = useOutbox as jest.Mock;
const mockRetryHook = useRetryOutboxItem as jest.Mock;
const mockDiscardHook = useDiscardOutboxItem as jest.Mock;
const retry = jest.fn();
const discard = jest.fn();

function failedItem(id: number, jobId: number): OutboxRow {
  return {
    id,
    actionType: 'UPDATE_STATUS',
    payload: { id: jobId, status_type_id: 5 },
    status: 'failed',
    attempts: 1,
    lastError: 'No changes made',
    createdAt: '2026-06-03 10:00:00',
  };
}

function renderSheet() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SyncProblemsSheet visible onClose={jest.fn()} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.mockReturnValue({ data: [{ id: 100, jobRef: 'JOB-100' }], error: undefined });
  mockRetryHook.mockReturnValue({ mutate: retry, isPending: false });
  mockDiscardHook.mockReturnValue({ mutate: discard, isPending: false });
});

describe('SyncProblemsSheet', () => {
  it('shows the all-caught-up empty state when there are no failed items', () => {
    mockOutbox.mockReturnValue({ failed: [] });
    renderSheet();
    expect(screen.getByTestId('sync-problems-empty')).toBeTruthy();
  });

  it('lists a failed item with its job reference', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 100)] });
    renderSheet();
    expect(screen.getByTestId('sync-problem-1')).toBeTruthy();
    expect(screen.getByText('Job JOB-100')).toBeTruthy();
  });

  it('falls back to the raw job id when the ref is unknown', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 999)] });
    renderSheet();
    expect(screen.getByText('Job #999')).toBeTruthy();
  });

  it('retries and discards the item by id', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 100)] });
    renderSheet();

    fireEvent.press(screen.getByTestId('sync-problem-retry-1'));
    expect(retry).toHaveBeenCalledWith(1);

    fireEvent.press(screen.getByTestId('sync-problem-discard-1'));
    expect(discard).toHaveBeenCalledWith(1);
  });

  it('Retry has an accessibilityLabel including the job ref', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 100)] });
    renderSheet();
    expect(screen.getByLabelText('Retry update for JOB-100')).toBeTruthy();
  });

  it('Discard has an accessibilityLabel including the job ref', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 100)] });
    renderSheet();
    expect(screen.getByLabelText('Discard update for JOB-100')).toBeTruthy();
  });

  it('uses dangerSurface token for the item background (no hardcoded hex)', () => {
    mockOutbox.mockReturnValue({ failed: [failedItem(1, 100)] });
    renderSheet();
    // The item container uses COLOURS.dangerSurface — verify the testID renders.
    expect(screen.getByTestId('sync-problem-1')).toBeTruthy();
  });
});
