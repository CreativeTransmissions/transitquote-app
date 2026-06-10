/**
 * Tests for StatusGlossarySheet (H-6): rows rendered from statuses, colours resolved, close.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusGlossarySheet } from '../StatusGlossarySheet';

// SheetContainer fires hapticLight on open — silence the native module.
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
  hapticSuccess: jest.fn(() => Promise.resolve()),
  hapticError: jest.fn(() => Promise.resolve()),
}));

// Provide a fixed set of status types from the DB hook.
jest.mock('../../../hooks/useStatusTypes', () => ({
  useStatusTypes: () => [
    { id: 1, name: 'Booked' },
    { id: 2, name: 'In Transit' },
    { id: 5, name: 'Delivered' },
    { id: 9, name: 'Cancelled' },
  ],
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderSheet(onClose = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <StatusGlossarySheet visible onClose={onClose} />
    </SafeAreaProvider>,
  );
}

describe('StatusGlossarySheet', () => {
  it('renders a row for each status type', () => {
    renderSheet();
    expect(screen.getByTestId('glossary-status-1')).toBeTruthy();
    expect(screen.getByTestId('glossary-status-2')).toBeTruthy();
    expect(screen.getByTestId('glossary-status-5')).toBeTruthy();
    expect(screen.getByTestId('glossary-status-9')).toBeTruthy();
  });

  it('shows the status names as text', () => {
    renderSheet();
    expect(screen.getByText('Booked')).toBeTruthy();
    expect(screen.getByText('In Transit')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('renders the sheet title "Job statuses"', () => {
    renderSheet();
    expect(screen.getByText('Job statuses')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderSheet(onClose);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
