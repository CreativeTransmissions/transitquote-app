/**
 * Tests for DriverPicker — the assign-driver bottom sheet (uses SheetContainer for chrome).
 * An empty list shows the "no permission" message, the current assignee is ticked, and
 * selecting/cancelling fires the right callback.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DriverPicker } from '../DriverPicker';
import type { DriverRow } from '../../../database/schema';

// SheetContainer fires hapticLight on open — silence the native module.
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
  hapticSuccess: jest.fn(() => Promise.resolve()),
  hapticError: jest.fn(() => Promise.resolve()),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function driver(id: number, overrides: Partial<DriverRow> = {}): DriverRow {
  return {
    id,
    wpUserId: null,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: null,
    phone: null,
    available: true,
    canAssignTo: null,
    roles: null,
    ...overrides,
  };
}

function renderPicker(props: Partial<React.ComponentProps<typeof DriverPicker>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DriverPicker
        visible
        drivers={[driver(1), driver(2)]}
        currentDriverId={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('DriverPicker', () => {
  it('lists the assignable drivers', () => {
    renderPicker();
    expect(screen.getByTestId('driver-option-1')).toBeTruthy();
    expect(screen.getByText('First1 Last1')).toBeTruthy();
    expect(screen.getByText('First2 Last2')).toBeTruthy();
  });

  it('shows the no-permission empty state when there are no assignable drivers', () => {
    renderPicker({ drivers: [] });
    expect(screen.getByText('No drivers available')).toBeTruthy();
    expect(screen.getByText(/don't have permission/)).toBeTruthy();
    expect(screen.queryByTestId('driver-option-1')).toBeNull();
  });

  it('marks the currently-assigned driver with accessibilityState selected', () => {
    renderPicker({ currentDriverId: 2 });
    const row = screen.getByTestId('driver-option-2');
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('non-current driver rows are not selected', () => {
    renderPicker({ currentDriverId: 2 });
    const row = screen.getByTestId('driver-option-1');
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
  });

  it('shows availability for each driver', () => {
    renderPicker({ drivers: [driver(1, { available: false })] });
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('falls back to "Driver {id}" when the name is blank', () => {
    renderPicker({ drivers: [driver(9, { firstName: null, lastName: null })] });
    expect(screen.getByText('Driver 9')).toBeTruthy();
  });

  it('calls onSelect with the chosen driver', () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    fireEvent.press(screen.getByTestId('driver-option-2'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('calls onClose when Cancel is tapped', () => {
    const onClose = jest.fn();
    renderPicker({ onClose });
    fireEvent.press(screen.getByTestId('driver-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderPicker({ onClose });
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
