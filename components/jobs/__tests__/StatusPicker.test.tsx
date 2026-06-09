/**
 * Tests for StatusPicker — lists the site's status types, ticks the current one, select/cancel.
 * Uses SheetContainer (which wraps Modal) for chrome.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusPicker } from '../StatusPicker';
import type { StatusType } from '../../../hooks/useStatusTypes';

// SheetContainer fires hapticLight on open — silence the native module.
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
  hapticSuccess: jest.fn(() => Promise.resolve()),
  hapticError: jest.fn(() => Promise.resolve()),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const STATUSES: StatusType[] = [
  { id: 1, name: 'Booked' },
  { id: 5, name: 'Delivered' },
];

function renderPicker(props: Partial<React.ComponentProps<typeof StatusPicker>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <StatusPicker visible statuses={STATUSES} currentStatusId={null} onSelect={jest.fn()} onClose={jest.fn()} {...props} />
    </SafeAreaProvider>,
  );
}

describe('StatusPicker', () => {
  it('lists the status options', () => {
    renderPicker();
    expect(screen.getByTestId('status-option-1')).toBeTruthy();
    expect(screen.getByText('Booked')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('marks the current status row with accessibilityState selected', () => {
    renderPicker({ currentStatusId: 5 });
    const row = screen.getByTestId('status-option-5');
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('non-current rows are not selected', () => {
    renderPicker({ currentStatusId: 5 });
    const row = screen.getByTestId('status-option-1');
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
  });

  it('calls onSelect with the chosen status', () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    fireEvent.press(screen.getByTestId('status-option-5'));
    expect(onSelect).toHaveBeenCalledWith({ id: 5, name: 'Delivered' });
  });

  it('calls onClose from Cancel', () => {
    const onClose = jest.fn();
    renderPicker({ onClose });
    fireEvent.press(screen.getByTestId('status-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel has accessibilityRole="button"', () => {
    renderPicker();
    const cancel = screen.getByTestId('status-cancel');
    expect(cancel.props.accessibilityRole).toBe('button');
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderPicker({ onClose });
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
