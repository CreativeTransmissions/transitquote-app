/**
 * Tests for JobCard's display branches: ASAP vs resolved pickup time, optional customer/address
 * lines, the optional driver line (Unassigned fallback), and the outbox sync badge (pending /
 * failed / none). The date formatter is stubbed to a deterministic echo (localisation is covered
 * by the formatter's own tests).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { JobCard } from '../JobCard';
import type { JobRow } from '../../../database/schema';

jest.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: () => '',
    formatDateTime: () => '',
    formatDateTimeSmart: (iso: string | null | undefined) => (iso ? `at ${iso}` : ''),
  }),
}));

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: 1,
    jobRef: 'JOB-001',
    statusName: 'Booked',
    customerFirstName: 'Ada',
    customerLastName: 'Lovelace',
    driverName: null,
    pickupIsAsap: false,
    pickupDatetime: '2026-06-03 14:00:00',
    pickupAddress: '10 Downing St',
    ...overrides,
  } as JobRow;
}

describe('JobCard', () => {
  it('renders the reference, customer (surname first), pickup time and address', () => {
    render(<JobCard job={makeJob()} onPress={jest.fn()} />);
    expect(screen.getByText('JOB-001')).toBeTruthy();
    expect(screen.getByTestId('job-customer-1')).toHaveTextContent('Lovelace, Ada');
    expect(screen.getByTestId('job-pickup-time-1')).toHaveTextContent('at 2026-06-03 14:00:00');
    expect(screen.getByTestId('job-pickup-address-1')).toHaveTextContent('10 Downing St');
  });

  it('shows "ASAP" instead of a time for ASAP bookings', () => {
    render(<JobCard job={makeJob({ pickupIsAsap: true })} onPress={jest.fn()} />);
    expect(screen.getByTestId('job-pickup-time-1')).toHaveTextContent('ASAP');
  });

  it('omits the customer line when no customer name is present', () => {
    render(<JobCard job={makeJob({ customerFirstName: null, customerLastName: null })} onPress={jest.fn()} />);
    expect(screen.queryByTestId('job-customer-1')).toBeNull();
  });

  it('shows the driver name when showDriver is set, and "Unassigned" when absent', () => {
    const { rerender } = render(<JobCard job={makeJob({ driverName: 'Pat' })} showDriver onPress={jest.fn()} />);
    expect(screen.getByText('Pat')).toBeTruthy();

    rerender(<JobCard job={makeJob({ driverName: null })} showDriver onPress={jest.fn()} />);
    expect(screen.getByText('Unassigned')).toBeTruthy();
  });

  it('renders the outbox sync state when provided', () => {
    const { rerender } = render(<JobCard job={makeJob()} outboxState="pending" onPress={jest.fn()} />);
    expect(screen.getByText('↻ Pending sync')).toBeTruthy();

    rerender(<JobCard job={makeJob()} outboxState="failed" onPress={jest.fn()} />);
    expect(screen.getByText('⚠ Update failed')).toBeTruthy();
  });

  it('shows no sync badge when there is no outbox state', () => {
    render(<JobCard job={makeJob()} onPress={jest.fn()} />);
    expect(screen.queryByText(/Pending sync|Update failed/)).toBeNull();
  });

  it('calls onPress with the job id when tapped', () => {
    const onPress = jest.fn();
    render(<JobCard job={makeJob({ id: 7 })} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('job-card-7'));
    expect(onPress).toHaveBeenCalledWith(7);
  });
});
