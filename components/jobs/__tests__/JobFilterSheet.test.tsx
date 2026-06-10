/**
 * Tests for JobFilterSheet — status multi-select, dispatcher-only driver filter, native date
 * pickers, quick preset chips, and the local draft that only takes effect on Apply.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JobFilterSheet } from '../JobFilterSheet';
import { EMPTY_FILTERS } from '../../../utils/jobFilter';
import type { StatusType } from '../../../hooks/useStatusTypes';
import type { DriverRow } from '../../../database/schema';

// ── Manual mock for @react-native-community/datetimepicker ──────────────────
// The native module is not available in Jest (no native renderer). We replace it with a
// controlled stub that lets tests simulate a date selection by calling onChange directly.
// jest.mock factories run in a sandboxed scope so we must use require for in-factory imports.
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactMod = require('react');
  const { View } = require('react-native');
  function DateTimePicker({ onChange, testID }: {
    onChange: (event: unknown, date?: Date) => void;
    value: Date;
    testID?: string;
  }) {
    (global as Record<string, unknown>).__dtpOnChange = onChange;
    return ReactMod.createElement(View, { testID: testID ?? 'date-time-picker' });
  }
  return { __esModule: true, default: DateTimePicker };
});
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Silence haptics ──────────────────────────────────────────────────────────
jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
  hapticSuccess: jest.fn(() => Promise.resolve()),
  hapticError: jest.fn(() => Promise.resolve()),
}));

// ── Freeze time so preset expectations are deterministic ─────────────────────
// We use dayjs and JS Date, so we freeze both.
const FROZEN = '2026-06-09'; // a Tuesday
const FROZEN_DATE = new Date('2026-06-09T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FROZEN_DATE);
});
afterEach(() => {
  jest.useRealTimers();
  delete (global as Record<string, unknown>).__dtpOnChange;
});

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const STATUSES: StatusType[] = [{ id: 1, name: 'Booked' }, { id: 3, name: 'In Transit' }];
const DRIVERS = [{ id: 7, firstName: 'Pat', lastName: 'D' }] as DriverRow[];

function renderSheet(props: Partial<React.ComponentProps<typeof JobFilterSheet>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <JobFilterSheet
        visible
        filters={EMPTY_FILTERS}
        statuses={STATUSES}
        drivers={DRIVERS}
        showDriverFilter={false}
        onApply={jest.fn()}
        onClear={jest.fn()}
        onClose={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

// Helper to invoke the datetimepicker onChange that was registered by the stub.
function simulateDatePick(date: Date) {
  const onChange = (global as Record<string, unknown>).__dtpOnChange as
    | ((event: unknown, date?: Date) => void)
    | undefined;
  if (!onChange) throw new Error('DateTimePicker onChange not registered — picker not open?');
  act(() => onChange({}, date));
}

// ── Existing behaviour (must stay green) ────────────────────────────────────

describe('JobFilterSheet — status & driver chips', () => {
  it('renders the status chips', () => {
    renderSheet();
    expect(screen.getByTestId('filter-status-1')).toBeTruthy();
    expect(screen.getByTestId('filter-status-3')).toBeTruthy();
  });

  it('hides the driver filter unless showDriverFilter is set', () => {
    renderSheet({ showDriverFilter: false });
    expect(screen.queryByTestId('filter-driver-any')).toBeNull();
  });

  it('shows the driver filter (Any + drivers) for dispatchers', () => {
    renderSheet({ showDriverFilter: true });
    expect(screen.getByTestId('filter-driver-any')).toBeTruthy();
    expect(screen.getByTestId('filter-driver-7')).toBeTruthy();
  });

  it('applies the toggled status in the draft only on Apply', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });

    fireEvent.press(screen.getByTestId('filter-status-3'));
    expect(onApply).not.toHaveBeenCalled(); // draft change is not applied yet

    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ statusIds: [3] }));
  });

  it('selects a driver in the draft and applies it', () => {
    const onApply = jest.fn();
    renderSheet({ showDriverFilter: true, onApply });
    fireEvent.press(screen.getByTestId('filter-driver-7'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ driverId: 7 }));
  });

  it('calls onClear from Clear all', () => {
    const onClear = jest.fn();
    renderSheet({ onClear });
    fireEvent.press(screen.getByTestId('filter-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('status chips have accessibilityRole="button" and accessibilityState', () => {
    renderSheet({ filters: { statusIds: [1], driverId: null, dateFrom: null, dateTo: null } });
    const activeChip = screen.getByTestId('filter-status-1');
    expect(activeChip.props.accessibilityRole).toBe('button');
    expect(activeChip.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    const inactiveChip = screen.getByTestId('filter-status-3');
    expect(inactiveChip.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
  });

  it('"Clear all" has accessibilityRole="button"', () => {
    renderSheet();
    expect(screen.getByTestId('filter-clear').props.accessibilityRole).toBe('button');
  });

  it('driver chips have accessibilityRole="button" and accessibilityState', () => {
    renderSheet({ showDriverFilter: true });
    const anyChip = screen.getByTestId('filter-driver-any');
    expect(anyChip.props.accessibilityRole).toBe('button');
    // "Any" is selected by default (driverId is null)
    expect(anyChip.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });
});

// ── Date picker fields ────────────────────────────────────────────────────────

describe('JobFilterSheet — date picker fields', () => {
  it('shows "Any date" placeholder when no dates are set', () => {
    renderSheet();
    const allAnyDate = screen.getAllByText('Any date');
    expect(allAnyDate.length).toBeGreaterThanOrEqual(2);
  });

  it('From date field has accessibilityRole="button" and descriptive label', () => {
    renderSheet();
    const field = screen.getByTestId('filter-date-from');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityLabel).toMatch(/From date/);
  });

  it('To date field has accessibilityRole="button" and descriptive label', () => {
    renderSheet();
    const field = screen.getByTestId('filter-date-to');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityLabel).toMatch(/To date/);
  });

  it('opens the from picker when the From field is tapped', () => {
    renderSheet();
    expect(screen.queryByTestId('date-time-picker')).toBeNull();
    fireEvent.press(screen.getByTestId('filter-date-from'));
    expect(screen.getByTestId('date-time-picker')).toBeTruthy();
  });

  it('opens the to picker when the To field is tapped', () => {
    renderSheet();
    expect(screen.queryByTestId('date-time-picker')).toBeNull();
    fireEvent.press(screen.getByTestId('filter-date-to'));
    expect(screen.getByTestId('date-time-picker')).toBeTruthy();
  });

  it('selecting a from date formats it and passes it to Apply', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });
    fireEvent.press(screen.getByTestId('filter-date-from'));
    simulateDatePick(new Date('2026-05-12'));
    // Picker closes; formatted date appears in the field label
    const field = screen.getByTestId('filter-date-from');
    expect(field.props.accessibilityLabel).toContain('12 May 2026');
    // Apply commits it
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: '2026-05-12' }));
  });

  it('selecting a to date passes the correct YYYY-MM-DD string to Apply', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });
    fireEvent.press(screen.getByTestId('filter-date-to'));
    simulateDatePick(new Date('2026-06-30'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateTo: '2026-06-30' }));
  });

  it('clear from date removes the value', () => {
    const onApply = jest.fn();
    renderSheet({
      onApply,
      filters: { statusIds: [], driverId: null, dateFrom: '2026-05-12', dateTo: null },
    });
    // Clear button should be visible now
    fireEvent.press(screen.getByTestId('filter-date-from-clear'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: null }));
  });

  it('clear to date removes the value', () => {
    const onApply = jest.fn();
    renderSheet({
      onApply,
      filters: { statusIds: [], driverId: null, dateFrom: null, dateTo: '2026-06-30' },
    });
    fireEvent.press(screen.getByTestId('filter-date-to-clear'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateTo: null }));
  });

  it('clear from affordance has accessibilityLabel "Clear from date"', () => {
    renderSheet({
      filters: { statusIds: [], driverId: null, dateFrom: '2026-05-12', dateTo: null },
    });
    expect(screen.getByLabelText('Clear from date')).toBeTruthy();
  });

  it('clear to affordance has accessibilityLabel "Clear to date"', () => {
    renderSheet({
      filters: { statusIds: [], driverId: null, dateFrom: null, dateTo: '2026-06-30' },
    });
    expect(screen.getByLabelText('Clear to date')).toBeTruthy();
  });
});

// ── Quick preset chips ────────────────────────────────────────────────────────

describe('JobFilterSheet — preset chips', () => {
  it('renders Today, This week and All preset chips', () => {
    renderSheet();
    expect(screen.getByTestId('filter-preset-today')).toBeTruthy();
    expect(screen.getByTestId('filter-preset-this-week')).toBeTruthy();
    expect(screen.getByTestId('filter-preset-all')).toBeTruthy();
  });

  it('Today preset sets dateFrom and dateTo to today', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });
    fireEvent.press(screen.getByTestId('filter-preset-today'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      dateFrom: FROZEN,
      dateTo: FROZEN,
    }));
  });

  it('This week preset sets Monday–Sunday of the current week', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });
    fireEvent.press(screen.getByTestId('filter-preset-this-week'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    // 2026-06-09 is a Tuesday; Monday = 2026-06-08, Sunday = 2026-06-14
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      dateFrom: '2026-06-08',
      dateTo: '2026-06-14',
    }));
  });

  it('All preset clears both date fields', () => {
    const onApply = jest.fn();
    renderSheet({
      onApply,
      filters: { statusIds: [], driverId: null, dateFrom: '2026-05-01', dateTo: '2026-05-31' },
    });
    fireEvent.press(screen.getByTestId('filter-preset-all'));
    fireEvent.press(screen.getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: null, dateTo: null }));
  });

  it('Today chip shows as selected when the draft matches today', () => {
    renderSheet({
      filters: { statusIds: [], driverId: null, dateFrom: FROZEN, dateTo: FROZEN },
    });
    const chip = screen.getByTestId('filter-preset-today');
    expect(chip.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('All chip shows as selected when no dates are set', () => {
    renderSheet({ filters: EMPTY_FILTERS });
    const chip = screen.getByTestId('filter-preset-all');
    expect(chip.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('preset chips have accessibilityRole="button"', () => {
    renderSheet();
    expect(screen.getByTestId('filter-preset-today').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('filter-preset-this-week').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('filter-preset-all').props.accessibilityRole).toBe('button');
  });

  it('preset chips only modify the draft, not applied state immediately', () => {
    const onApply = jest.fn();
    renderSheet({ onApply });
    fireEvent.press(screen.getByTestId('filter-preset-today'));
    expect(onApply).not.toHaveBeenCalled();
  });
});
