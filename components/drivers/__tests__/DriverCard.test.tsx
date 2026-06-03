/** Tests for DriverCard: name (+ fallback), availability badge, contact, job-count pluralisation, onPress. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DriverCard } from '../DriverCard';
import type { DriverRow } from '../../../database/schema';

function driver(overrides: Partial<DriverRow> = {}): DriverRow {
  return {
    id: 1,
    wpUserId: null,
    firstName: 'Pat',
    lastName: 'Driver',
    email: 'pat@example.com',
    phone: '0700',
    available: true,
    canAssignTo: null,
    roles: null,
    ...overrides,
  };
}

describe('DriverCard', () => {
  it('renders the name, contact and available badge', () => {
    render(<DriverCard driver={driver()} jobCount={3} onPress={jest.fn()} />);
    expect(screen.getByText('Pat Driver')).toBeTruthy();
    expect(screen.getByText('pat@example.com · 0700')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('shows the unavailable badge when the driver is unavailable', () => {
    render(<DriverCard driver={driver({ available: false })} jobCount={0} onPress={jest.fn()} />);
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('pluralises the assigned-job count', () => {
    const { rerender } = render(<DriverCard driver={driver()} jobCount={1} onPress={jest.fn()} />);
    expect(screen.getByText('1 assigned job')).toBeTruthy();
    rerender(<DriverCard driver={driver()} jobCount={2} onPress={jest.fn()} />);
    expect(screen.getByText('2 assigned jobs')).toBeTruthy();
  });

  it('falls back to "Driver {id}" when the name is blank', () => {
    render(<DriverCard driver={driver({ id: 8, firstName: null, lastName: null })} jobCount={0} onPress={jest.fn()} />);
    expect(screen.getByText('Driver 8')).toBeTruthy();
  });

  it('calls onPress with the driver id', () => {
    const onPress = jest.fn();
    render(<DriverCard driver={driver({ id: 8 })} jobCount={0} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('driver-card-8'));
    expect(onPress).toHaveBeenCalledWith(8);
  });
});
