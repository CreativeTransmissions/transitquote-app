import { flushOutbox } from '../outboxFlusher';
import * as outboxQueries from '../../queries/outbox';
import * as jobsApi from '../../../services/api/jobs';
import { ApiActionError } from '../../../services/apiError';
import type { OutboxRow } from '../../schema';

// Factory mocks: avoid loading the real query module, which transitively imports the native
// expo-sqlite client (unresolvable under jest).
jest.mock('../../queries/outbox', () => ({
  getProcessable: jest.fn(),
  markInProgress: jest.fn(),
  removeOutboxItem: jest.fn(),
  markFailed: jest.fn(),
  markPendingRetry: jest.fn(),
}));
jest.mock('../../../services/api/jobs', () => ({
  updateAssigned: jest.fn(),
  updateJobStatus: jest.fn(),
}));

const getProcessable = outboxQueries.getProcessable as jest.Mock;
const markInProgress = outboxQueries.markInProgress as jest.Mock;
const removeOutboxItem = outboxQueries.removeOutboxItem as jest.Mock;
const markFailed = outboxQueries.markFailed as jest.Mock;
const markPendingRetry = outboxQueries.markPendingRetry as jest.Mock;
const updateAssigned = jobsApi.updateAssigned as jest.Mock;
const updateJobStatus = jobsApi.updateJobStatus as jest.Mock;

function assignRow(id: number, attempts = 0, status: OutboxRow['status'] = 'pending'): OutboxRow {
  return {
    id,
    actionType: 'ASSIGN_DRIVER',
    payload: { id: 100 + id, driver_id: 7 },
    status,
    attempts,
    lastError: null,
    createdAt: '2026-06-03 10:00:00',
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so any unconsumed mockReturnValueOnce queue from a prior
  // test is dropped, then re-establish the API success defaults.
  jest.resetAllMocks();
  updateAssigned.mockResolvedValue(undefined);
  updateJobStatus.mockResolvedValue(undefined);
});

describe('flushOutbox single-flight guard', () => {
  it('dispatches each action exactly once when called concurrently (no double-submit)', async () => {
    // First pass sees one pending row; any subsequent pass sees an empty queue.
    getProcessable.mockReturnValueOnce([assignRow(1)]).mockReturnValue([]);

    const p1 = flushOutbox();
    const p2 = flushOutbox(); // overlaps the first — must coalesce, not start a second pass

    expect(p2).toBe(p1); // same in-flight promise
    await Promise.all([p1, p2]);

    expect(updateAssigned).toHaveBeenCalledTimes(1); // the bug would call it twice
    expect(removeOutboxItem).toHaveBeenCalledTimes(1);
    expect(removeOutboxItem).toHaveBeenCalledWith(1);
  });

  it('does one more pass when a flush is requested mid-flight (coalesced re-run)', async () => {
    let release!: () => void;
    updateAssigned.mockImplementationOnce(
      () => new Promise<void>((resolve) => { release = () => resolve(); }),
    );
    // Pass 1: row 1 (held). Pass 2 (the re-run): row 2. Then empty.
    getProcessable
      .mockReturnValueOnce([assignRow(1)])
      .mockReturnValueOnce([assignRow(2)])
      .mockReturnValue([]);

    const p1 = flushOutbox(); // begins pass 1, awaits row 1
    const p2 = flushOutbox(); // requests a re-run while pass 1 is in flight
    expect(p2).toBe(p1);

    release(); // let row 1 resolve → loop runs pass 2, picks up row 2
    await Promise.all([p1, p2]);

    expect(updateAssigned).toHaveBeenCalledTimes(2);
    expect(removeOutboxItem).toHaveBeenCalledWith(1);
    expect(removeOutboxItem).toHaveBeenCalledWith(2);
  });

  it('releases the guard so a later flush runs a fresh pass', async () => {
    // No concurrent caller => one pass => getProcessable read exactly once per flush.
    getProcessable.mockReturnValueOnce([assignRow(1)]);
    await flushOutbox();
    expect(updateAssigned).toHaveBeenCalledTimes(1);

    getProcessable.mockReturnValueOnce([assignRow(2)]);
    await flushOutbox();
    expect(updateAssigned).toHaveBeenCalledTimes(2);
  });
});

describe('flushOutbox failure classification', () => {
  it('marks a 200+success:false (ApiActionError) item failed without retry', async () => {
    getProcessable.mockReturnValueOnce([assignRow(1)]).mockReturnValue([]);
    updateAssigned.mockRejectedValueOnce(new ApiActionError('No changes made'));

    await flushOutbox();

    expect(markFailed).toHaveBeenCalledWith(1, 'No changes made');
    expect(markPendingRetry).not.toHaveBeenCalled();
    expect(removeOutboxItem).not.toHaveBeenCalled();
  });

  it('leaves a transient (network) failure pending with incremented attempts', async () => {
    getProcessable.mockReturnValueOnce([assignRow(1, 2)]).mockReturnValue([]);
    updateAssigned.mockRejectedValueOnce(new Error('Network request failed'));

    await flushOutbox();

    expect(markPendingRetry).toHaveBeenCalledWith(1, 'Network request failed', 3);
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('fails a transient item once it reaches MAX_RETRY_ATTEMPTS', async () => {
    getProcessable.mockReturnValueOnce([assignRow(1, 4)]).mockReturnValue([]); // 4 -> 5 = MAX
    updateAssigned.mockRejectedValueOnce(new Error('Network request failed'));

    await flushOutbox();

    expect(markFailed).toHaveBeenCalledWith(1, 'Network request failed');
    expect(markPendingRetry).not.toHaveBeenCalled();
  });
});

describe('flushOutbox attempt accounting (interrupted-run recovery)', () => {
  it('persists the incremented attempt count when marking a row in_progress', async () => {
    getProcessable.mockReturnValueOnce([assignRow(1, 0)]).mockReturnValue([]);

    await flushOutbox();

    // attempt count is written BEFORE dispatch, so an app-kill mid-network can't reset it to 0.
    expect(markInProgress).toHaveBeenCalledWith(1, 1);
  });

  it('fails a recovered in_progress row that has already exhausted its attempts (no infinite loop)', async () => {
    // Left in_progress by repeated interrupted runs; attempts already at MAX. 5 -> 6 > MAX.
    getProcessable.mockReturnValueOnce([assignRow(1, 5, 'in_progress')]).mockReturnValue([]);

    await flushOutbox();

    expect(markFailed).toHaveBeenCalledTimes(1);
    expect(updateAssigned).not.toHaveBeenCalled(); // capped before going to the network again
    expect(markInProgress).not.toHaveBeenCalled();
  });
});
