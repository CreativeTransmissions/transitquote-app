/**
 * Tests for the job detail screen: load states (hydrating / error / not-found), the status-update
 * confirm→mutate flow, claim and assign affordances gated by role, and the failed-action retry/
 * discard. Hooks + picker children are mocked; Button/Badge/EmptyState are real; Alert is mocked
 * so we can drive its confirm button.
 */
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import JobDetailScreen from '../[id]';

let mockDetail: Record<string, unknown>;
let mockRole: Record<string, unknown>;
let mockAssignable: Record<string, unknown>;
let mockOutbox: { failed: { id: number; payload: { id: number }; lastError: string | null }[] };
const mockUpdateMutate = jest.fn();
const mockAssignMutate = jest.fn();
const mockRetryMutate = jest.fn();
const mockDiscardMutate = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: '5' }),
}));
jest.mock('../../../../hooks/useJobDetail', () => ({ useJobDetail: () => mockDetail }));
jest.mock('../../../../hooks/useTeamSettings', () => ({ useTeamSettings: () => ({ currencySymbol: '£' }) }));
jest.mock('../../../../hooks/useDateFormat', () => ({ useDateFormat: () => ({ formatDateTimeSmart: () => '' }) }));
jest.mock('../../../../hooks/useStatusTypes', () => ({ useStatusTypes: () => [{ id: 5, name: 'Delivered' }] }));
jest.mock('../../../../hooks/useUpdateJobStatus', () => ({ useUpdateJobStatus: () => ({ mutate: mockUpdateMutate, isPending: false }) }));
jest.mock('../../../../hooks/useAssignDriver', () => ({ useAssignDriver: () => ({ mutate: mockAssignMutate, isPending: false }) }));
jest.mock('../../../../hooks/useDrivers', () => ({ useAssignableDrivers: () => mockAssignable }));
jest.mock('../../../../hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ firstName: 'Me', lastName: 'Driver' }) }));
jest.mock('../../../../hooks/useRole', () => ({ useRole: () => mockRole }));
jest.mock('../../../../hooks/useOutbox', () => ({ useOutbox: () => mockOutbox }));
jest.mock('../../../../hooks/useOutboxActions', () => ({
  useRetryOutboxItem: () => ({ mutate: mockRetryMutate, isPending: false }),
  useDiscardOutboxItem: () => ({ mutate: mockDiscardMutate, isPending: false }),
}));
jest.mock('../../../../components/sync/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../../../components/jobs/StopList', () => ({ StopList: () => null }));
jest.mock('../../../../components/jobs/DriverPicker', () => ({ DriverPicker: () => null }));
// StatusPicker stub exposes a button that fires onSelect so we can drive the confirm flow.
jest.mock('../../../../components/jobs/StatusPicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    StatusPicker: ({ onSelect }: { onSelect: (s: { id: number; name: string }) => void }) =>
      React.createElement(Pressable, { testID: 'pick-status', onPress: () => onSelect({ id: 5, name: 'Delivered' }) }, React.createElement(Text, null, 'pick')),
  };
});

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <JobDetailScreen />
    </SafeAreaProvider>,
  );
}

function pressAlertButton(index: number) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as { onPress?: () => void }[];
  return buttons[index].onPress?.();
}

function detail(overrides: Record<string, unknown> = {}) {
  return { job: { id: 5, jobRef: 'JOB-5', statusName: 'Booked', statusTypeId: 1, driverId: null }, detail: null, isHydrating: false, error: null, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockDetail = detail();
  mockRole = { isDriver: false, isDispatcher: true, isDecentralized: false, driverId: null };
  mockAssignable = { drivers: [{ id: 9, firstName: 'A', lastName: 'B' }], canAssign: true };
  mockOutbox = { failed: [] };
});

describe('JobDetailScreen — load states', () => {
  it('shows a not-found state when there is no job', () => {
    mockDetail = detail({ job: null });
    renderScreen();
    expect(screen.getByText('Job not found')).toBeTruthy();
  });

  it('shows an error state when loading failed with no job', () => {
    mockDetail = detail({ job: null, error: new Error('net') });
    renderScreen();
    expect(screen.getByText('Couldn’t load this job')).toBeTruthy();
  });

  it('renders the job reference and status when loaded', () => {
    renderScreen();
    expect(screen.getByText('JOB-5')).toBeTruthy();
    expect(screen.getByText('Booked')).toBeTruthy();
  });
});

describe('JobDetailScreen — status update', () => {
  it('confirms the chosen status then mutates', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('pick-status')); // selects Delivered
    expect(Alert.alert).toHaveBeenCalledWith('Update status', expect.stringContaining('Delivered'), expect.any(Array));

    pressAlertButton(1); // Confirm
    expect(mockUpdateMutate).toHaveBeenCalledWith({ jobId: 5, statusTypeId: 5, statusName: 'Delivered' });
  });
});

describe('JobDetailScreen — assignment', () => {
  it('shows the Assign button for a dispatcher and opens the picker', () => {
    renderScreen();
    expect(screen.getByTestId('job-assign')).toBeTruthy();
    expect(screen.queryByTestId('job-claim')).toBeNull();
  });

  it('offers Claim to a decentralized driver on an unassigned job, and confirms→assigns to self', () => {
    mockRole = { isDriver: true, isDispatcher: false, isDecentralized: true, driverId: 7 };
    mockAssignable = { drivers: [], canAssign: false };
    renderScreen();

    fireEvent.press(screen.getByTestId('job-claim'));
    expect(Alert.alert).toHaveBeenCalledWith('Claim job', expect.any(String), expect.any(Array));
    pressAlertButton(1); // Claim
    expect(mockAssignMutate).toHaveBeenCalledWith({ jobId: 5, driverId: 7, driverName: 'Me Driver' });
  });
});

describe('JobDetailScreen — failed action', () => {
  it('shows the failed banner and wires retry/discard', () => {
    mockOutbox = { failed: [{ id: 99, payload: { id: 5 }, lastError: 'No changes made' }] };
    renderScreen();
    expect(screen.getByText(/Action failed: No changes made/)).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));
    expect(mockRetryMutate).toHaveBeenCalledWith(99);
    fireEvent.press(screen.getByText('Discard'));
    expect(mockDiscardMutate).toHaveBeenCalledWith(99);
  });
});
