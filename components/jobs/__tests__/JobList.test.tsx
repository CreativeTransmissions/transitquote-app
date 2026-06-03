/**
 * Tests for JobList — renders a JobCard per job, an empty state when there are none, and forwards
 * selection. The date formatter (JobCard's only external dependency) is stubbed.
 */
jest.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: () => '',
    formatDateTime: () => '',
    formatDateTimeSmart: () => '',
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { JobList } from '../JobList';
import type { JobRow } from '../../../database/schema';

function job(id: number): JobRow {
  return { id, jobRef: `JOB-${id}`, statusName: 'Booked', pickupIsAsap: true } as JobRow;
}

describe('JobList', () => {
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
});
