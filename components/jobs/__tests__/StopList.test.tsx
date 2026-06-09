import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StopList } from '../StopList';
import { COLOURS } from '../../../constants';
import type { Stop } from '../../../types/api';

// StopList's only dependency is the date formatter — stub it to a deterministic value so the
// test asserts on contact/note rendering, not date localisation (covered by formatter tests).
jest.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: () => '',
    formatDateTime: () => '',
    formatDateTimeSmart: (iso: string | null | undefined) => (iso ? `at ${iso}` : ''),
  }),
}));

function makeStop(overrides: Partial<Stop> = {}): Stop {
  return {
    id: '42',
    address: '10 Downing St, London',
    appartment_no: '',
    street_number: '10',
    postal_town: 'London',
    route: 'Downing St',
    administrative_area_level_2: '',
    administrative_area_level_1: '',
    country: 'UK',
    postal_code: 'SW1A 2AA',
    lat: '51.5',
    lng: '-0.12',
    place_id: 'abc',
    created: '2026-06-01 09:00:00',
    modified: '2026-06-01 09:00:00',
    collection_date: '2026-06-02 14:00:00',
    time_type: '',
    datetime_type: null,
    visit_type: 'pickup',
    contact_name: 'John Smith',
    contact_phone: '07700111222',
    note: '',
    journey_order: '0',
    ...overrides,
  };
}

describe('StopList', () => {
  it('renders a stop with its contact name and phone', () => {
    render(<StopList stops={[makeStop()]} />);
    expect(screen.getByText('John Smith · 07700111222')).toBeTruthy();
  });

  it('calls onCallStop with the stop when the contact is tapped', () => {
    const onCallStop = jest.fn();
    const stop = makeStop();
    render(<StopList stops={[stop]} onCallStop={onCallStop} />);

    fireEvent.press(screen.getByTestId('stop-0-call'));

    expect(onCallStop).toHaveBeenCalledTimes(1);
    expect(onCallStop).toHaveBeenCalledWith(stop);
  });

  it('renders the contact as plain text (no call affordance) when onCallStop is not provided', () => {
    render(<StopList stops={[makeStop()]} />);
    expect(screen.queryByTestId('stop-0-call')).toBeNull();
    expect(screen.getByText('John Smith · 07700111222')).toBeTruthy();
  });

  it('shows only the name when the phone is blank, and offers no call affordance', () => {
    const onCallStop = jest.fn();
    render(<StopList stops={[makeStop({ contact_phone: '' })]} onCallStop={onCallStop} />);

    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.queryByTestId('stop-0-call')).toBeNull();
  });

  it('hides the contact line entirely when both name and phone are blank', () => {
    render(<StopList stops={[makeStop({ contact_name: '', contact_phone: '' })]} />);
    expect(screen.queryByText(/·/)).toBeNull();
    // address still renders
    expect(screen.getByText('10 Downing St, London')).toBeTruthy();
  });

  it('renders a per-stop note when present', () => {
    render(<StopList stops={[makeStop({ note: 'Leave at reception' })]} />);
    expect(screen.getByText('Leave at reception')).toBeTruthy();
  });

  it('opens the stop (maps) when the row is tapped', () => {
    const onOpenStop = jest.fn();
    const stop = makeStop();
    render(<StopList stops={[stop]} onOpenStop={onOpenStop} />);

    fireEvent.press(screen.getByTestId('stop-0'));

    expect(onOpenStop).toHaveBeenCalledWith(stop);
  });

  it('row has correct accessibilityLabel when onOpenStop is provided', () => {
    const stop = makeStop();
    render(<StopList stops={[stop]} onOpenStop={jest.fn()} />);
    const row = screen.getByTestId('stop-0');
    expect(row.props.accessibilityLabel).toBe('Open stop 1, 10 Downing St, London, in Maps');
  });

  it('row has no accessibilityLabel when onOpenStop is not provided', () => {
    const stop = makeStop();
    render(<StopList stops={[stop]} />);
    const row = screen.getByTestId('stop-0');
    expect(row.props.accessibilityLabel).toBeUndefined();
  });

  it('call link has accessibilityLabel with contact name and phone', () => {
    const stop = makeStop();
    render(<StopList stops={[stop]} onCallStop={jest.fn()} />);
    const link = screen.getByTestId('stop-0-call');
    expect(link.props.accessibilityLabel).toBe('Call John Smith 07700111222');
  });

  it('renders a timeline dot per stop', () => {
    render(<StopList stops={[makeStop({ id: '1' }), makeStop({ id: '2' })]} />);
    expect(screen.getByTestId('stop-0-dot')).toBeTruthy();
    expect(screen.getByTestId('stop-1-dot')).toBeTruthy();
  });

  it('colours the first stop dot with statusActive and the rest with textMuted', () => {
    render(<StopList stops={[makeStop({ id: '1' }), makeStop({ id: '2' })]} />);
    const first = StyleSheet.flatten(screen.getByTestId('stop-0-dot').props.style);
    const second = StyleSheet.flatten(screen.getByTestId('stop-1-dot').props.style);
    expect(first.backgroundColor).toBe(COLOURS.statusActive);
    expect(second.backgroundColor).toBe(COLOURS.textMuted);
  });
});
