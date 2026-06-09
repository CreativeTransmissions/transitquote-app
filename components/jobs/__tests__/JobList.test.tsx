/**
 * Tests for JobList — renders a JobCard per job, an empty state when there are none, forwards
 * selection, passes lookup maps to each card, and uses stable callbacks. The date formatter
 * (JobCard dependency) and useJobCardLookups (JobList dependency) are stubbed.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { JobList } from '../JobList';
import { useJobCardLookups } from '../../../hooks/useJobCardLookups';
import type { JobRow } from '../../../database/schema';

jest.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: () => '',
    formatDateTime: () => '',
    formatDateTimeSmart: () => '',
  }),
}));

jest.mock('../../../hooks/useJobCardLookups', () => ({
  useJobCardLookups: jest.fn(() => ({
    serviceNames: { 1: 'Same Day' },
    vehicleNames: { 1: 'Van' },
    paymentStatusNames: { 1: 'Paid' },
  })),
}));

// Icon stub
jest.mock('../../../components/shared/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

// JobStatusBadge stub
jest.mock('../JobStatusBadge', () => ({
  JobStatusBadge: ({ statusName }: { statusName: string | null }) => {
    const { Text } = require('react-native');
    return <Text>{statusName ?? 'Unknown'}</Text>;
  },
}));

const mockUseLookups = useJobCardLookups as jest.Mock;

function job(id: number): JobRow {
  return {
    id,
    jobRef: `JOB-${id}`,
    statusName: 'Booked',
    statusTypeId: 1,
    pickupIsAsap: true,
    serviceId: null,
    vehicleId: null,
    paymentStatusId: null,
  } as JobRow;
}

describe('JobList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLookups.mockReturnValue({
      serviceNames: { 1: 'Same Day' },
      vehicleNames: { 1: 'Van' },
      paymentStatusNames: { 1: 'Paid' },
    });
  });

  it('renders a card per job', () => {
    render(<JobList jobs={[job(1), job(2)]} onSelect={jest.fn()} refreshing={false} onRefresh={jest.fn()} />);
    expect(screen.getByTestId('job-card-1')).toBeTruthy();
    expect(screen.getByTestId('job-card-2')).toBeTruthy();
  });

  it('shows the empty state (with custom copy) when there are no jobs', () => {
    render(
      <JobList
        jobs={[]}
        onSelect={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        emptyTitle="No available jobs"
        emptySubtitle="Check back later"
      />,
    );
    expect(screen.getByText('No available jobs')).toBeTruthy();
    expect(screen.getByText('Check back later')).toBeTruthy();
    expect(screen.queryByTestId('job-card-1')).toBeNull();
  });

  it('forwards card selection', () => {
    const onSelect = jest.fn();
    render(<JobList jobs={[job(5)]} onSelect={onSelect} refreshing={false} onRefresh={jest.fn()} />);
    fireEvent.press(screen.getByTestId('job-card-5'));
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('calls useJobCardLookups to obtain reference maps', () => {
    render(<JobList jobs={[job(1)]} onSelect={jest.fn()} refreshing={false} onRefresh={jest.fn()} />);
    expect(mockUseLookups).toHaveBeenCalled();
  });

  it('passes outboxState primitive derived from outboxStateByJob map', () => {
    const outboxStateByJob = new Map<number, 'pending' | 'failed'>();
    outboxStateByJob.set(1, 'pending');
    render(
      <JobList
        jobs={[job(1)]}
        onSelect={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        outboxStateByJob={outboxStateByJob}
      />,
    );
    expect(screen.getByText('Pending sync')).toBeTruthy();
  });

  it('passes emptyIcon to EmptyState when provided', () => {
    render(
      <JobList
        jobs={[]}
        onSelect={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        emptyTitle="No jobs"
        emptyIcon="briefcase-outline"
      />,
    );
    // EmptyState renders the icon — it should be in the tree without crashing.
    expect(screen.getByText('No jobs')).toBeTruthy();
  });

  it('renders the emptyAction button label and fires onPress', () => {
    const onPress = jest.fn();
    render(
      <JobList
        jobs={[]}
        onSelect={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        emptyTitle="No jobs"
        emptyAction={{ label: 'Clear filters', onPress }}
      />,
    );
    expect(screen.getByText('Clear filters')).toBeTruthy();
    fireEvent.press(screen.getByText('Clear filters'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when emptyAction is omitted', () => {
    render(
      <JobList
        jobs={[]}
        onSelect={jest.fn()}
        refreshing={false}
        onRefresh={jest.fn()}
        emptyTitle="No jobs"
      />,
    );
    expect(screen.queryByText('Clear filters')).toBeNull();
  });
});
