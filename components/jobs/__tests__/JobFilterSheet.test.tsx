/**
 * Tests for JobFilterSheet — status multi-select, dispatcher-only driver filter, and the local
 * draft that only takes effect on Apply (Clear resets). Driver filter is hidden for drivers.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JobFilterSheet } from '../JobFilterSheet';
import { EMPTY_FILTERS } from '../../../utils/jobFilter';
import type { StatusType } from '../../../hooks/useStatusTypes';
import type { DriverRow } from '../../../database/schema';

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

describe('JobFilterSheet', () => {
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
});
