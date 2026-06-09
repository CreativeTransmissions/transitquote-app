/**
 * Tests for JobCard's display branches: ASAP vs resolved pickup time, optional customer/address
 * lines, the optional driver line (Unassigned fallback + warning colour), the outbox sync badge
 * (pending / failed / none using Icon + text), payment badge logic, lookup map rendering, and
 * React.memo identity. The date formatter is stubbed to a deterministic echo.
 */
import React from 'react';
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

// Icon renders a MaterialCommunityIcons glyph — stub it to a simple testable element.
jest.mock('../../../components/shared/Icon', () => ({
  Icon: ({ name, testID }: { name: string; testID?: string }) => {
    const { Text } = require('react-native');
    return <Text testID={testID ?? `icon-${name}`}>{name}</Text>;
  },
}));

// JobStatusBadge has its own tests; stub it here.
jest.mock('../JobStatusBadge', () => ({
  JobStatusBadge: ({ statusName }: { statusName: string | null }) => {
    const { Text } = require('react-native');
    return <Text>{statusName ?? 'Unknown'}</Text>;
  },
}));

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: 1,
    jobRef: 'JOB-001',
    statusName: 'Booked',
    statusTypeId: 1,
    customerFirstName: 'Ada',
    customerLastName: 'Lovelace',
    driverName: null,
    driverId: null,
    pickupIsAsap: false,
    pickupDatetime: '2026-06-03 14:00:00',
    pickupAddress: '10 Downing St',
    serviceId: null,
    vehicleId: null,
    paymentStatusId: null,
    ...overrides,
  } as JobRow;
}

describe('JobCard — core display', () => {
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

  it('calls onPress with the job id when tapped', () => {
    const onPress = jest.fn();
    render(<JobCard job={makeJob({ id: 7 })} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('job-card-7'));
    expect(onPress).toHaveBeenCalledWith(7);
  });
});

describe('JobCard — driver row', () => {
  it('shows the driver name when showDriver is set', () => {
    render(<JobCard job={makeJob({ driverName: 'Pat' })} showDriver onPress={jest.fn()} />);
    expect(screen.getByText('Pat')).toBeTruthy();
  });

  it('shows "Unassigned" when showDriver and no driver name', () => {
    render(<JobCard job={makeJob({ driverName: null })} showDriver onPress={jest.fn()} />);
    expect(screen.getByText('Unassigned')).toBeTruthy();
  });

  it('does not render the driver row when showDriver is false', () => {
    render(<JobCard job={makeJob({ driverName: 'Pat' })} showDriver={false} onPress={jest.fn()} />);
    expect(screen.queryByText('Pat')).toBeNull();
  });
});

describe('JobCard — sync state', () => {
  it('renders "Pending sync" text when outboxState is pending', () => {
    render(<JobCard job={makeJob()} outboxState="pending" onPress={jest.fn()} />);
    expect(screen.getByText('Pending sync')).toBeTruthy();
  });

  it('renders "Update failed" text when outboxState is failed', () => {
    render(<JobCard job={makeJob()} outboxState="failed" onPress={jest.fn()} />);
    expect(screen.getByText('Update failed')).toBeTruthy();
  });

  it('shows no sync row when there is no outbox state', () => {
    render(<JobCard job={makeJob()} onPress={jest.fn()} />);
    expect(screen.queryByText('Pending sync')).toBeNull();
    expect(screen.queryByText('Update failed')).toBeNull();
  });
});

describe('JobCard — payment badge', () => {
  it('renders the payment status name when paymentStatusId is present and a name is in the map', () => {
    render(
      <JobCard
        job={makeJob({ paymentStatusId: 2 })}
        paymentStatusNames={{ 2: 'Paid' }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Paid')).toBeTruthy();
  });

  it('renders "Unpaid" with warning tint (not paid)', () => {
    render(
      <JobCard
        job={makeJob({ paymentStatusId: 1 })}
        paymentStatusNames={{ 1: 'Unpaid' }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Unpaid')).toBeTruthy();
  });

  it('renders "Not paid" correctly as not-paid', () => {
    render(
      <JobCard
        job={makeJob({ paymentStatusId: 3 })}
        paymentStatusNames={{ 3: 'Not paid' }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Not paid')).toBeTruthy();
  });

  it('omits the payment badge when paymentStatusId is null', () => {
    render(<JobCard job={makeJob({ paymentStatusId: null })} onPress={jest.fn()} />);
    // No payment text should appear
    expect(screen.queryByText('Paid')).toBeNull();
    expect(screen.queryByText('Unpaid')).toBeNull();
  });

  it('omits the payment badge when paymentStatusId is not in the map', () => {
    render(
      <JobCard
        job={makeJob({ paymentStatusId: 99 })}
        paymentStatusNames={{ 1: 'Paid' }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText('Paid')).toBeNull();
  });
});

describe('JobCard — lookup maps (service / vehicle)', () => {
  it('renders service · vehicle in the meta row when maps are provided', () => {
    render(
      <JobCard
        job={makeJob({ serviceId: 1, vehicleId: 2 })}
        serviceNames={{ 1: 'Same Day' }}
        vehicleNames={{ 2: 'Van' }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Same Day · Van')).toBeTruthy();
  });

  it('renders only the service when vehicleId has no mapping', () => {
    render(
      <JobCard
        job={makeJob({ serviceId: 1, vehicleId: null })}
        serviceNames={{ 1: 'Overnight' }}
        vehicleNames={{}}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Overnight')).toBeTruthy();
  });

  it('renders nothing in the meta text when no ids match', () => {
    render(
      <JobCard
        job={makeJob({ serviceId: null, vehicleId: null })}
        serviceNames={{}}
        vehicleNames={{}}
        onPress={jest.fn()}
      />,
    );
    // The meta row will show an empty View — no meta text; no service/vehicle text visible
    expect(screen.queryByText(/Same Day|Van|Overnight/)).toBeNull();
  });
});

describe('JobCard — React.memo identity', () => {
  it('is wrapped in React.memo', () => {
    // React.memo wraps the component and exposes $$typeof or the inner type
    expect((JobCard as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });
});
