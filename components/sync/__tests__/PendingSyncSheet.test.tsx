/**
 * PendingSyncSheet — opens from the pending badge, lists pending items, close button works.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useOutbox } from '../../../hooks/useOutbox';
import { PendingSyncSheet } from '../PendingSyncSheet';
import type { OutboxRow } from '../../../database/schema';

jest.mock('../../../database/client');
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));
jest.mock('../../../hooks/useOutbox', () => ({ useOutbox: jest.fn() }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockLive = useLiveQuery as jest.Mock;
const mockOutbox = useOutbox as jest.Mock;

function pendingItem(id: number, jobId: number): OutboxRow {
  return {
    id,
    actionType: 'UPDATE_STATUS',
    payload: { id: jobId, status_type_id: 5 },
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: '2026-06-09 10:00:00',
  };
}

function renderSheet(onClose = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PendingSyncSheet visible onClose={onClose} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.mockReturnValue({ data: [{ id: 42, jobRef: 'JOB-42' }], error: undefined });
  mockOutbox.mockReturnValue({ items: [], pendingCount: 0, failed: [], stateByJob: new Map() });
});

describe('PendingSyncSheet', () => {
  it('shows the empty "nothing pending" state when the outbox has no pending items', () => {
    mockOutbox.mockReturnValue({ items: [], pendingCount: 0, failed: [], stateByJob: new Map() });
    renderSheet();
    expect(screen.getByTestId('pending-sync-empty')).toBeTruthy();
  });

  it('lists a pending item with its job ref', () => {
    const item = pendingItem(1, 42);
    mockOutbox.mockReturnValue({ items: [item], pendingCount: 1, failed: [], stateByJob: new Map() });
    renderSheet();
    expect(screen.getByTestId('pending-item-1')).toBeTruthy();
    expect(screen.getByText('Job JOB-42')).toBeTruthy();
  });

  it('falls back to the raw job id when the ref is unknown', () => {
    const item = pendingItem(1, 999);
    mockOutbox.mockReturnValue({ items: [item], pendingCount: 1, failed: [], stateByJob: new Map() });
    renderSheet();
    expect(screen.getByText('Job #999')).toBeTruthy();
  });

  it('lists multiple pending items', () => {
    const items = [pendingItem(1, 42), pendingItem(2, 43)];
    mockLive.mockReturnValue({ data: [{ id: 42, jobRef: 'JOB-42' }, { id: 43, jobRef: 'JOB-43' }], error: undefined });
    mockOutbox.mockReturnValue({ items, pendingCount: 2, failed: [], stateByJob: new Map() });
    renderSheet();
    expect(screen.getByTestId('pending-item-1')).toBeTruthy();
    expect(screen.getByTestId('pending-item-2')).toBeTruthy();
  });

  it('does not list failed items (only pending/in_progress)', () => {
    const failed: OutboxRow = {
      id: 99,
      actionType: 'UPDATE_STATUS',
      payload: { id: 42, status_type_id: 5 },
      status: 'failed',
      attempts: 3,
      lastError: 'boom',
      createdAt: '2026-06-09 10:00:00',
    };
    mockOutbox.mockReturnValue({ items: [failed], pendingCount: 0, failed: [failed], stateByJob: new Map() });
    renderSheet();
    expect(screen.getByTestId('pending-sync-empty')).toBeTruthy();
    expect(screen.queryByTestId('pending-item-99')).toBeNull();
  });

  it('calls onClose when the Close button is pressed', () => {
    const onClose = jest.fn();
    mockOutbox.mockReturnValue({ items: [], pendingCount: 0, failed: [], stateByJob: new Map() });
    renderSheet(onClose);
    fireEvent.press(screen.getByTestId('pending-sync-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the reassuring body copy', () => {
    mockOutbox.mockReturnValue({ items: [], pendingCount: 0, failed: [], stateByJob: new Map() });
    renderSheet();
    expect(
      screen.getByText(
        /saved on your phone and will send automatically when you're back online/i,
      ),
    ).toBeTruthy();
  });
});
